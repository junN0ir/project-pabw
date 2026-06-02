import db from "../config/db.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:4b-instruct";

const normalizeText = (value) => {
  return String(value || "").toLowerCase().trim();
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return parsed;
};

const calculateLocalScore = (room, preferences) => {
  const budgetMax = parseNumber(preferences.budget_max);
  const guestCount = parseNumber(preferences.guest_count);
  const preferredFacilities = Array.isArray(preferences.preferred_facilities)
    ? preferences.preferred_facilities
    : [];

  let score = 0;

  if (budgetMax && room.price <= budgetMax) {
    const priceRatio = room.price / budgetMax;
    score += Math.max(0, 30 - priceRatio * 20);
  }

  if (guestCount && room.capacity >= guestCount) {
    score += 20;
  }

  const facilityText = normalizeText(room.facility);

  const matchedFacilities = preferredFacilities.filter((facility) => {
    return facilityText.includes(normalizeText(facility));
  });

  score += matchedFacilities.length * 15;

  if (room.avg_rating > 0) {
    score += Number(room.avg_rating) * 5;
  }

  return {
    score: Math.round(score),
    matched_facilities: matchedFacilities
  };
};

const extractJsonFromText = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Response Ollama bukan JSON valid.");
    }

    const jsonText = text.slice(start, end + 1);
    return JSON.parse(jsonText);
  }
};

const buildFallbackRecommendation = (rankedCandidates, preferences) => {
  const topCandidates = rankedCandidates.slice(0, 3);

  return {
    recommended_hotels: topCandidates.map((candidate, index) => ({
      rank: index + 1,
      id_list_hotel: candidate.id_list_hotel,
      hotel_name: candidate.hotel_name,
      location: candidate.location,
      id_list_kamar: candidate.id_list_kamar,
      room_number: candidate.room_number,
      type_room: candidate.type_room,
      price: candidate.price,
      capacity: candidate.capacity,
      facility: candidate.facility,
      avg_rating: candidate.avg_rating,
      total_rating: candidate.total_rating,
      score: candidate.local_score,
      reason: `Hotel ini dipilih dari database karena kamar masih tersedia, harga sesuai filter, kapasitas memenuhi kebutuhan, dan fasilitas yang cocok adalah ${candidate.matched_facilities.length > 0 ? candidate.matched_facilities.join(", ") : "belum ada yang cocok secara spesifik"}.`
    })),
    summary: `Rekomendasi dibuat dari ${rankedCandidates.length} kandidat kamar yang tersedia di database.`,
    note: "Fallback digunakan karena response Ollama tidak bisa diparse sebagai JSON valid."
  };
};

const extractPreferencesFromPrompt = async (prompt) => {
  const systemPrompt = `
Kamu adalah parser preferensi hotel.
Tugasmu hanya mengekstrak preferensi customer dari teks bebas.
Jawaban wajib JSON valid.
Jangan gunakan markdown.
Jika data tidak disebutkan, isi null atau array kosong.
`;

  const userPrompt = `
Ekstrak preferensi hotel dari teks berikut:

"${prompt}"

Format output wajib:
{
  "location": string atau null,
  "budget_max": number atau null,
  "guest_count": number atau null,
  "preferred_facilities": array of string,
  "purpose": string atau null
}
`;

  const ollamaResponse = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      options: {
        temperature: 0.1
      }
    })
  });

  if (!ollamaResponse.ok) {
    throw new Error(`Gagal ekstrak prompt. Status Ollama: ${ollamaResponse.status}`);
  }

  const ollamaData = await ollamaResponse.json();
  const content = ollamaData?.message?.content;

  if (!content) {
    throw new Error("Response ekstraksi prompt kosong.");
  }

  return extractJsonFromText(content);
};

export const recommendHotelForCustomer = async (req, res) => {
  try {
    let requestData = req.body;

    if (req.body.prompt && typeof req.body.prompt === "string") {
    const extractedPreferences = await extractPreferencesFromPrompt(req.body.prompt);

    requestData = {
        ...extractedPreferences,
        limit: req.body.limit || 30
    };
    }

    const {
    location,
    budget_max,
    guest_count,
    preferred_facilities = [],
    purpose,
    limit = 30
    } = requestData;

    const budgetMax = parseNumber(budget_max);
    const guestCount = parseNumber(guest_count);
    const limitValue = Math.min(parseNumber(limit) || 30, 50);

    if (!location && !budgetMax && !guestCount && preferred_facilities.length === 0) {
      return res.status(400).json({
        message: "Minimal isi salah satu preferensi: location, budget_max, guest_count, atau preferred_facilities."
      });
    }

    const whereClauses = ["lk.status = 'available'"];
    const params = [];

    if (location) {
      whereClauses.push("lh.location LIKE ?");
      params.push(`%${location.trim()}%`);
    }

    if (budgetMax) {
      whereClauses.push("lk.price <= ?");
      params.push(budgetMax);
    }

    if (guestCount) {
      whereClauses.push("dk.capacity >= ?");
      params.push(guestCount);
    }

    const [rows] = await db.query(
      `SELECT
        lh.id_list_hotel,
        lh.hotel_name,
        lh.location,
        lh.contact_person,
        lh.contact_email,
        lh.contact_phone,
        lk.id_list_kamar,
        lk.room_number,
        lk.price,
        lk.status,
        dk.id_detail_kamar,
        dk.type_room,
        dk.description AS room_description,
        dk.facility,
        dk.capacity,
        COALESCE(rt.avg_rating, 0) AS avg_rating,
        COALESCE(rt.total_rating, 0) AS total_rating
      FROM list_kamar lk
      JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
      JOIN detail_kamar dk ON lk.id_detail_kamar = dk.id_detail_kamar
      LEFT JOIN (
        SELECT
          id_list_hotel,
          AVG(rating) AS avg_rating,
          COUNT(*) AS total_rating
        FROM hotel_rating
        GROUP BY id_list_hotel
      ) rt ON rt.id_list_hotel = lh.id_list_hotel
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY lk.price ASC
      LIMIT ?`,
      [...params, limitValue]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Tidak ada hotel atau kamar tersedia yang cocok dengan preferensi dari database.",
        preferences: {
          location: location || null,
          budget_max: budgetMax,
          guest_count: guestCount,
          preferred_facilities,
          purpose: purpose || null
        },
        data: []
      });
    }

    const candidates = rows.map((row) => {
      const localResult = calculateLocalScore(
        {
          ...row,
          price: Number(row.price),
          avg_rating: Number(row.avg_rating),
          total_rating: Number(row.total_rating)
        },
        requestData
    );

      return {
        id_list_hotel: row.id_list_hotel,
        hotel_name: row.hotel_name,
        location: row.location,
        contact_person: row.contact_person,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        id_list_kamar: row.id_list_kamar,
        room_number: row.room_number,
        price: Number(row.price),
        status: row.status,
        id_detail_kamar: row.id_detail_kamar,
        type_room: row.type_room,
        room_description: row.room_description,
        facility: row.facility,
        capacity: row.capacity,
        avg_rating: Number(row.avg_rating),
        total_rating: Number(row.total_rating),
        local_score: localResult.score,
        matched_facilities: localResult.matched_facilities
      };
    });

    const rankedCandidates = candidates.sort((a, b) => {
      if (b.local_score !== a.local_score) {
        return b.local_score - a.local_score;
      }

      return a.price - b.price;
    });

    const candidatesForLlm = rankedCandidates.slice(0, 10);

    const systemPrompt = `
Kamu adalah modul rekomendasi hotel untuk aplikasi booking hotel.
Kamu hanya boleh menggunakan data kandidat hotel yang diberikan oleh backend.
Jangan membuat nama hotel, harga, kamar, fasilitas, rating, atau lokasi yang tidak ada pada kandidat.
Jawaban wajib berupa JSON valid.
Jangan gunakan markdown.
`;

    const userPrompt = JSON.stringify({
      task: "Pilih maksimal 3 hotel atau kamar terbaik untuk customer berdasarkan preferensi.",
      customer_preferences: {
        location: location || null,
        budget_max: budgetMax,
        guest_count: guestCount,
        preferred_facilities,
        purpose: purpose || null
      },
      candidate_hotels_from_database: candidatesForLlm,
      required_output_format: {
        recommended_hotels: [
          {
            rank: 1,
            id_list_hotel: "number",
            hotel_name: "string",
            location: "string",
            id_list_kamar: "number",
            room_number: "string",
            type_room: "string",
            price: "number",
            capacity: "number",
            score: "number from 0 to 100",
            reason: "string"
          }
        ],
        summary: "string"
      }
    });

    let recommendation;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const ollamaResponse = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          format: "json",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          options: {
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama error dengan status ${ollamaResponse.status}`);
      }

      const ollamaData = await ollamaResponse.json();
      const content = ollamaData?.message?.content;

      if (!content) {
        throw new Error("Response Ollama kosong.");
      }

      recommendation = extractJsonFromText(content);

    } catch (ollamaError) {
      recommendation = buildFallbackRecommendation(rankedCandidates, requestData);
      recommendation.ollama_error = ollamaError.message;
    }

    return res.json({
      message: "Rekomendasi hotel berhasil dibuat dari database project dan Ollama.",
      source: "database_mysql_project_dan_ollama",
      model: OLLAMA_MODEL,
      preferences: {
        location: location || null,
        budget_max: budgetMax,
        guest_count: guestCount,
        preferred_facilities,
        purpose: purpose || null
      },
      total_candidates_from_database: rows.length,
      candidates_used_by_llm: candidatesForLlm.length,
      data: recommendation
    });

  } catch (error) {
    return res.status(500).json({
      message: "Gagal membuat rekomendasi hotel.",
      error: error.message
    });
  }
};