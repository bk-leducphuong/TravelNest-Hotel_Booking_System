# Hotel Search Service - Architecture Review & Recommendations

## Overall Assessment ⭐⭐⭐⭐

Your draft shows a **solid hybrid search architecture** combining Elasticsearch for fast filtering with database queries for precise availability. This is the right approach for hotel search systems!

---

## ✅ What's Good (Keep These)

1. **Hybrid Architecture**: ES for candidates + DB for availability is industry-standard
2. **Two-phase filtering**: Fast ES filtering followed by precise DB checks
3. **Separation of concerns**: Clear distinction between "general availability" vs "date-specific availability"
4. **Realistic approach**: Understanding ES limitations for date-range queries

---

## 🔧 Critical Issues to Fix

### 1. **Sample Query Issues**

**Current Problems:**
```json
{
  "filter": [
    { "term": { "city": "Da Nang" } },  // ❌ Should use "city.keyword" for exact match
    { "terms": { "amenities": ["WIFI", "POOL"] } }  // ❌ Field name mismatch (should be "amenity_codes")
  ],
  "must": [
    {
      "geo_distance": { ... }  // ❌ Should be in "filter" not "must" (no scoring needed)
    }
  ]
}
```

**Recommended Fix:**
```json
{
  "query": {
    "bool": {
      "filter": [
        { "match": { "city": "Da Nang" } },  // ✅ Use match for fuzzy city search
        { "range": { "min_price": { "lte": 2000000 } } },
        { "term": { "status.keyword": "active" } },  // ✅ Add status check
        { "term": { "is_available": true } },
        { "term": { "has_available_rooms": true } },  // ✅ Add room availability
        { "terms": { "amenity_codes": ["FREE_WIFI", "POOL"] } },  // ✅ Correct field name
        {
          "geo_distance": {
            "distance": "5km",
            "location": { "lat": 16.06, "lon": 108.21 }
          }
        }
      ]
    }
  },
  "sort": [
    {
      "_geo_distance": {
        "location": { "lat": 16.06, "lon": 108.21 },
        "order": "asc",
        "unit": "km"
      }
    }
  ],
  "size": 200  // ✅ Limit ES results for DB phase
}
```

### 2. **Missing Input Parameters**

Your doc doesn't specify what the API should accept. Add:

```javascript
// Required parameters
{
  // Location (at least one required)
  city?: string,
  country?: string,
  latitude?: number,
  longitude?: number,
  radius?: number,  // in km, default: 10
  
  // Dates (REQUIRED for availability)
  checkIn: string,   // ISO date: "2026-03-15"
  checkOut: string,  // ISO date: "2026-03-18"
  
  // Guests
  adults: number,    // default: 2
  children?: number, // default: 0
  rooms?: number,    // default: 1
  
  // Filters (optional)
  minPrice?: number,
  maxPrice?: number,
  minRating?: number,
  hotelClass?: number[],  // [3, 4, 5]
  amenities?: string[],   // ["FREE_WIFI", "POOL"]
  freeCancellation?: boolean,
  
  // Sorting
  sortBy?: "price" | "rating" | "distance" | "popularity",
  sortOrder?: "asc" | "desc",
  
  // Pagination
  page?: number,     // default: 1
  limit?: number     // default: 20, max: 100
}
```

---

## 📝 What to Add

### 3. **Detailed Phase Breakdown**

Expand each phase with more details:

#### **Phase 1: Elasticsearch - Find Candidate Hotels**

```
Input: User search criteria
Output: List of hotel_ids (max 200-500)

Responsibilities:
✅ Location-based filtering (city/geo-distance)
✅ Price range filtering (min_price/max_price)
✅ Amenity filtering
✅ Rating filtering
✅ Hotel class filtering
✅ Status filtering (active only)
✅ General availability flag (is_available = true)
✅ Sorting by distance/rating/popularity

Performance Target: < 100ms
Fallback: If no results, expand search radius or relax filters
```

#### **Phase 2: Database - Date-Specific Availability Check**

```sql
-- Check room_inventory for actual availability
SELECT 
  ri.room_id,
  r.hotel_id,
  MIN(ri.price_per_night) as min_price_for_dates,
  SUM(ri.total_rooms - ri.booked_rooms) as total_available_rooms
FROM room_inventory ri
JOIN rooms r ON ri.room_id = r.id
WHERE 
  r.hotel_id IN (:candidate_hotel_ids)
  AND ri.date >= :check_in
  AND ri.date < :check_out
  AND ri.status = 'open'
  AND (ri.total_rooms - ri.booked_rooms) >= :required_rooms
GROUP BY r.hotel_id
HAVING COUNT(DISTINCT ri.date) = :total_nights  -- All dates must be available
```

**Key Points:**
- Must have availability for ALL nights in the date range
- Must have enough rooms for the requested quantity
- Calculate actual price for the specific dates
- Filter out hotels with no availability

**Performance Target:** < 200ms
**Optimization:** Use indexed queries, consider caching for popular date ranges

#### **Phase 3: Room Type & Capacity Validation**

```
For each available hotel:
✅ Check room capacity (adults + children)
✅ Find suitable room types
✅ Calculate total price (sum of all nights)
✅ Check booking policies (min stay, max stay)
✅ Apply any date-specific pricing rules
```

#### **Phase 4: Pricing Calculation & Enrichment**

```javascript
For each hotel:
{
  hotel_id: "...",
  hotel_name: "...",
  
  // From Elasticsearch
  city: "Da Nang",
  location: { lat: 16.06, lon: 108.21 },
  distance: 2.3,  // km from search point
  avg_rating: 4.5,
  review_count: 120,
  hotel_class: 5,
  amenities: ["FREE_WIFI", "POOL", "SPA"],
  primary_image_url: "...",
  
  // From Database (calculated for specific dates)
  available_rooms: [
    {
      room_id: "...",
      room_type: "Deluxe Double",
      capacity: { adults: 2, children: 1 },
      price_per_night: 1500000,
      total_price: 4500000,  // 3 nights
      available_count: 3
    }
  ],
  min_price_for_dates: 1500000,
  max_price_for_dates: 2500000,
  total_available_rooms: 8
}
```

#### **Phase 5: Re-ranking & Sorting**

```javascript
// Apply user's sort preference
switch (sortBy) {
  case "price":
    sortBy = "min_price_for_dates";
    break;
  case "rating":
    sortBy = ["avg_rating DESC", "review_count DESC"];
    break;
  case "distance":
    sortBy = "distance ASC";
    break;
  case "popularity":
    sortBy = "total_bookings DESC";
    break;
  default:
    // Smart ranking: combine multiple factors
    sortBy = calculateSmartScore({
      distance: 0.3,
      rating: 0.3,
      price: 0.2,
      popularity: 0.2
    });
}
```

#### **Phase 6: Response Formatting**

```javascript
{
  "success": true,
  "data": {
    "hotels": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "filters_applied": {
      "city": "Da Nang",
      "checkIn": "2026-03-15",
      "checkOut": "2026-03-18",
      "nights": 3,
      "priceRange": { "min": 0, "max": 2000000 },
      "amenities": ["FREE_WIFI", "POOL"]
    },
    "search_metadata": {
      "es_candidates": 150,
      "available_hotels": 45,
      "search_time_ms": 234
    }
  }
}
```

---

## 🚀 Advanced Features to Consider

### 4. **Caching Strategy**

```javascript
// Cache popular searches
const cacheKey = `search:${city}:${checkIn}:${checkOut}:${filters_hash}`;
const cacheTTL = 5 * 60; // 5 minutes

// Cache layers:
1. ES results cache (10 min)
2. Availability cache (5 min)
3. Full response cache (3 min)
```

### 5. **Fallback Strategies**

```javascript
// If no results found:
1. Expand geo radius (5km → 10km → 20km)
2. Relax price range (+20%)
3. Remove optional amenities
4. Suggest alternative dates (±2 days)
5. Suggest nearby cities
```

### 6. **Performance Optimizations**

```javascript
// Parallel execution
Promise.all([
  elasticsearchSearch(),    // Phase 1
  getPopularHotels(),       // For recommendations
  getCachedPrices()         // Check cache first
]).then(([esResults, popular, cached]) => {
  // Continue with Phase 2
});

// Pagination optimization
// Only fetch detailed room info for current page
// Pre-fetch next page in background
```

### 7. **Search Analytics**

```javascript
// Track for improvements
{
  search_id: uuid(),
  user_id: "...",
  query: { ... },
  results_count: 45,
  clicked_hotels: [],
  booked_hotel: null,
  search_time_ms: 234,
  timestamp: "..."
}
```

### 8. **Error Handling**

```javascript
// Graceful degradation
try {
  results = await elasticsearchSearch();
} catch (esError) {
  logger.error("ES failed, falling back to DB", esError);
  results = await databaseSearch(); // Slower but reliable
}

// Partial failures
if (esResults.length === 0) {
  return suggestAlternatives();
}
```

---

## 🎯 Specific Recommendations

### **Add These Sections:**

1. **Search Query Builder**
   - How to construct ES query from user input
   - Query validation
   - Default values

2. **Availability Logic**
   - Detailed SQL queries
   - Edge cases (partial availability, overbooking)
   - Inventory locking during booking

3. **Price Calculation**
   - Base price + taxes + fees
   - Dynamic pricing rules
   - Discounts and promotions

4. **Ranking Algorithm**
   - Scoring formula
   - Boost factors
   - Personalization (if applicable)

5. **API Endpoints**
   ```
   POST /api/v1/hotels/search
   GET  /api/v1/hotels/search/suggestions
   GET  /api/v1/hotels/:id/availability
   ```

6. **Performance Benchmarks**
   - Target response times
   - Concurrent user capacity
   - Database query optimization

7. **Testing Strategy**
   - Unit tests for each phase
   - Integration tests for full flow
   - Load testing scenarios

### **Remove/Simplify:**

1. ❌ The typo "signa" → should be "signal"
2. ❌ Vague "merge + re-rank" → needs more detail
3. ❌ Missing error handling and edge cases

---

## 📊 Recommended Architecture Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Search Service (API Layer)         │
│  - Validate input                   │
│  - Build ES query                   │
│  - Orchestrate phases               │
└──────┬──────────────────────────────┘
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│Elasticsearch│   │   MySQL     │   │    Cache    │
│  (Phase 1)  │   │ (Phase 2-3) │   │   (Redis)   │
└─────────────┘   └─────────────┘   └─────────────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │   Merge &   │
                  │   Re-rank   │
                  │  (Phase 4)  │
                  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  Response   │
                  │ Formatter   │
                  │  (Phase 5)  │
                  └─────────────┘
```

---

## 🔍 Example Implementation Pseudocode

```javascript
async function searchHotels(searchParams) {
  // Validate
  const validated = validateSearchParams(searchParams);
  
  // Phase 1: ES Search
  const esQuery = buildElasticsearchQuery(validated);
  const candidateHotels = await elasticsearch.search(esQuery);
  
  if (candidateHotels.length === 0) {
    return handleNoResults(validated);
  }
  
  const hotelIds = candidateHotels.map(h => h.hotel_id);
  
  // Phase 2: Check Availability
  const availableHotels = await checkDateRangeAvailability({
    hotelIds,
    checkIn: validated.checkIn,
    checkOut: validated.checkOut,
    rooms: validated.rooms
  });
  
  if (availableHotels.length === 0) {
    return suggestAlternativeDates(validated);
  }
  
  // Phase 3: Get Room Details
  const hotelsWithRooms = await enrichWithRoomDetails(
    availableHotels,
    validated
  );
  
  // Phase 4: Merge ES data with DB data
  const enrichedHotels = mergeHotelData(
    candidateHotels,
    hotelsWithRooms
  );
  
  // Phase 5: Re-rank and sort
  const rankedHotels = rankAndSort(
    enrichedHotels,
    validated.sortBy
  );
  
  // Phase 6: Paginate
  const paginatedResults = paginate(
    rankedHotels,
    validated.page,
    validated.limit
  );
  
  // Phase 7: Format response
  return formatSearchResponse(paginatedResults, validated);
}
```

---

## ⚡ Performance Targets

| Phase | Target Time | Notes |
|-------|-------------|-------|
| Phase 1 (ES) | < 100ms | Should be cached |
| Phase 2 (DB) | < 200ms | Optimize with indexes |
| Phase 3 (Rooms) | < 100ms | Only for current page |
| Phase 4-6 | < 50ms | In-memory operations |
| **Total** | **< 450ms** | End-to-end |

---

## 🎓 Summary

**Your draft is a great start!** The core architecture is sound. To make it production-ready:

### Must Add:
1. ✅ Detailed input/output schemas
2. ✅ Complete SQL queries for Phase 2
3. ✅ Error handling and fallbacks
4. ✅ Caching strategy
5. ✅ Performance benchmarks
6. ✅ API endpoint specifications

### Must Fix:
1. ❌ Sample query field names
2. ❌ Missing status and room availability checks
3. ❌ Vague phase descriptions

### Nice to Have:
1. 🎯 Search analytics
2. 🎯 Personalization
3. 🎯 A/B testing framework
4. 🎯 Real-time inventory updates

Would you like me to help implement any specific phase or create the actual service code?
