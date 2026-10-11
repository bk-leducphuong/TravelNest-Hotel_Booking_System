# Feature B — Search · API evidence

_Generated 2026-10-09T13:21:14Z · window checkIn=2026-10-11 checkOut=2026-10-13_

### B-API-01 — search by city
```
GET /search/hotels
HTTP 200  time=0.116167s
{"success":true,"data":{"hotels":[{"hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","hotel_name":"View Hotel","city":"Ha Noi","country":"Vietnam","distance_km":null,"avg_rating":8.43,"review_count":13,"hotel_class":1,"amenity_codes":["LUGGAGE_STORAGE","BEACH_ACCESS","TOUR_DESK","LAUNDRY_SERVICE","BUSINESS_CENTER","CONCIERGE","AIRPORT_SHUTTLE","24H_RECEPTION","RESTAURANT","SPA","ROOM_SERVICE","FULL_BOARD","PARKING","FREE_WIFI","PET_FRIENDLY","NON_SMOKING","FITNESS_CENTER","BAR"],"has_free_cancellation":false,"primary_image_url":"hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/01a105e3-c4c4-72f1-834e-7dc4aad1b3da.avif","total_bookings":0,"view_count":0,"min_price_for_dates":283.33,"min_price_per_n
```
### B-API-02 — search by country
```
GET /search/hotels
HTTP 200  time=0.175279s
{"success":true,"data":{"hotels":[{"hotel_id":"01a105dc-2581-7129-9568-ef912699e63f","hotel_name":"Boutique Quigley Fort Court","city":"Bac Kan","country":"Vietnam","distance_km":null,"avg_rating":9.25,"review_count":10,"hotel_class":1,"amenity_codes":["ROOM_SERVICE","FULL_BOARD","CONCIERGE","HALF_BOARD","PET_FRIENDLY","FREE_WIFI","AIRPORT_SHUTTLE","24H_RECEPTION","PARKING","TOUR_DESK","WHEELCHAIR_ACCESSIBLE","LUGGAGE_STORAGE","LAUNDRY_SERVICE","MEETING_ROOMS","BUSINESS_CENTER","NON_SMOKING","TERRACE","GARDEN"],"has_free_cancellation":false,"primary_image_url":"hotel/01a105dc-2581-7129-9568-ef912699e63f/01a105e4-4b15-7f9f-ab39-81734594bd11.avif","total_bookings":0,"view_count":0,"min_price_f
```
### B-API-03 — search by lat/long
```
GET /search/hotels
HTTP 200  time=0.087777s
{"success":true,"data":{"hotels":[{"hotel_id":"01a105dc-25ae-70fd-bb54-dc27d5d2895c","hotel_name":"Plaza Marcelino Flats Manor","city":"Ha Noi","country":"Vietnam","distance_km":null,"avg_rating":8.33,"review_count":13,"hotel_class":3,"amenity_codes":["GARDEN","PET_FRIENDLY","PAID_WIFI","BEACH_ACCESS","FITNESS_CENTER","HALF_BOARD","FULL_BOARD","CONCIERGE","MEETING_ROOMS","TOUR_DESK","PARKING","LUGGAGE_STORAGE","LAUNDRY_SERVICE","POOL","NON_SMOKING"],"has_free_cancellation":false,"primary_image_url":"hotel/01a105dc-25ae-70fd-bb54-dc27d5d2895c/01a105e4-5a37-72f4-9e53-644065ad691d.avif","total_bookings":0,"view_count":0,"min_price_for_dates":421.24,"min_price_per_night":210.62,"available_rooms"
```
### B-API-04 — autocomplete hotels q=Ha
```
GET /search/autocomplete
HTTP 200  time=0.008924s
{"success":true,"data":{"suggestions":[]}}
```
### B-API-05 — destination autocomplete q=Ha
```
GET /search/destinations/autocomplete
HTTP 200  time=0.006960s
{"success":true,"data":{"suggestions":[{"text":"Ha Giang","score":1,"payload":{"id":"01a105dc-100b-71bd-ad05-0e5ecae8302a","type":"city","city_id":"01a105dc-0f42-7f25-89ee-b86030f02179","country_id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","display_name":"Ha Giang","normalized_name":"ha giang","slug":"ha-giang","country_name":"Vietnam","is_active":true,"created_at":"2026-10-04T07:41:10.000Z","updated_at":"2026-10-04T07:41:10.000Z"}},{"text":"Ha Nam","score":1,"payload":{"id":"01a105dc-100e-73a9-af7e-257fe26f30a0","type":"city","city_id":"01a105dc-0f45-7d51-9471-5c5ab3f9ebba","country_id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","display_name":"Ha Nam","normalized_name":"ha nam","slug":"ha-nam","
```
### B-API-06 — recent (auth)
```
GET /search/recent
HTTP 401  time=0.003447s
{"success":false,"message":"JWT expired"}
```
### B-API-07 — price filter
```
GET /search/hotels
HTTP 200  time=0.017858s
{"success":true,"data":{"hotels":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPrevPage":false},"filters_applied":{"destinationId":"01a105dc-0fce-7673-aeb3-b25469da159b","destinationType":"city","cityId":"01a105dc-0eeb-74b6-8a47-5e200f348df5","countryId":"01a105dc-0edc-7ce1-ab3c-a15746869e73","city":"Ha Noi","country":"Vietnam","checkIn":"2026-10-11T00:00:00.000Z","checkOut":"2026-10-13T00:00:00.000Z","nights":2},"search_metadata":{"es_candidates":0,"available_hotels":0,"search_time_ms":16,"timestamp":"2026-10-09T13:21:15.238Z"},"filter_options":{"budget":{"min":null,"max":null},"amenities":{},"hotelClass":{},"reviewScores":{"3":0,"4":0,"4.5":0,"3.5":0
```
### B-API-08 — hotelClass + rating + freeCancellation
```
GET /search/hotels
HTTP 200  time=0.016436s
{"success":true,"data":{"hotels":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPrevPage":false},"filters_applied":{"destinationId":"01a105dc-0fce-7673-aeb3-b25469da159b","destinationType":"city","cityId":"01a105dc-0eeb-74b6-8a47-5e200f348df5","countryId":"01a105dc-0edc-7ce1-ab3c-a15746869e73","city":"Ha Noi","country":"Vietnam","checkIn":"2026-10-11T00:00:00.000Z","checkOut":"2026-10-13T00:00:00.000Z","nights":2},"search_metadata":{"es_candidates":0,"available_hotels":0,"search_time_ms":15,"timestamp":"2026-10-09T13:21:15.262Z"},"filter_options":{"budget":{"min":null,"max":null},"amenities":{},"hotelClass":{},"reviewScores":{"3":0,"4":0,"4.5":0,"3.5":0
```
### B-API-09 — sortBy=price_asc
```
GET /search/hotels
HTTP 200  time=0.061400s
{"success":true,"data":{"hotels":[{"hotel_id":"01a105dc-252d-7b60-8c85-aeef8e8278bd","hotel_name":"Suites E 14th Street Inn","city":"Ha Noi","country":"Vietnam","distance_km":80,"avg_rating":7.37,"review_count":27,"hotel_class":4,"amenity_codes":["BEACH_ACCESS","24H_RECEPTION","ROOM_SERVICE_24H","ROOM_SERVICE","ALL_INCLUSIVE","FULL_BOARD","TERRACE"],"has_free_cancellation":false,"primary_image_url":"hotel/01a105dc-252d-7b60-8c85-aeef8e8278bd/01a105e3-e66e-7c04-a4ba-3f4778cd6035.avif","total_bookings":0,"view_count":0,"min_price_for_dates":181.31,"min_price_per_night":90.655,"available_rooms":[{"room_id":"01a105dc-27c8-74cc-b5b2-4c275b5bb569","room_type":"suite","max_guests":4,"room_size":65,
```
### B-API-10 — pagination page=2 limit=5
```
GET /search/hotels
HTTP 200  time=0.062022s
{"success":true,"data":{"hotels":[{"hotel_id":"01a105dc-24f8-7676-bcda-f902770e365c","hotel_name":"Lakeside Sigrid Camp Club","city":"Ha Noi","country":"Vietnam","distance_km":null,"avg_rating":8.01,"review_count":24,"hotel_class":5,"amenity_codes":["PARKING","RESTAURANT","SPA","POOL","TERRACE","TOUR_DESK","AIRPORT_SHUTTLE","LAUNDRY_SERVICE","ROOM_SERVICE","ROOM_SERVICE_24H","BUSINESS_CENTER","WHEELCHAIR_ACCESSIBLE","CONCIERGE","HALF_BOARD"],"has_free_cancellation":false,"primary_image_url":"hotel/01a105dc-24f8-7676-bcda-f902770e365c/01a105e3-d168-72ff-9122-702bf0ae7082.avif","total_bookings":0,"view_count":0,"min_price_for_dates":394.22,"min_price_per_night":197.11,"available_rooms":[{"room
```
### B-NEG-01 — missing checkIn -> 400
```
GET /search/hotels
HTTP 400  time=0.002161s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"checkIn":"checkIn is required","checkOut":"\"checkOut\" date references \"ref:checkIn\" which must have a valid date format"}}}
```
### B-NEG-02 — checkOut<=checkIn -> 400
```
GET /search/hotels
HTTP 400  time=0.001119s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"checkOut":"checkOut must be after checkIn"}}}
```
### B-NEG-03 — past checkIn -> 400
```
GET /search/hotels
HTTP 400  time=0.001470s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"checkIn":"checkIn must be in the future"}}}
```
### B-NEG-04 — no location -> 400
```
GET /search/hotels
HTTP 400  time=0.001616s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"At least one location parameter (city, country, or latitude/longitude) is required"}}}
```
### B-NEG-05 — missing adults -> 400
```
GET /search/hotels
HTTP 400  time=0.001417s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"adults":"adults is required"}}}
```
### B-NEG-06 — >30 nights -> 400
```
GET /search/hotels
HTTP 400  time=0.001201s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"\"value\" failed custom validation because "}}}
```
### B-NEG-07 — invalid sortBy -> 400
```
GET /search/hotels
HTTP 400  time=0.001052s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"sortBy":"sortBy must be one of: relevance, price_asc, price_desc, rating, distance, popularity"}}}
```
### B-NEG-08 — maxPrice<minPrice -> 400
```
GET /search/hotels
HTTP 400  time=0.001367s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"maxPrice":"maxPrice must be greater than minPrice"}}}
```
### B-NEG-09 — limit over max -> 400
```
GET /search/hotels
HTTP 400  time=0.001041s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be less than or equal to 100"}}}
```
### B-NEG-10 — autocomplete q too short -> 400
```
GET /search/autocomplete
HTTP 400  time=0.000733s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"query":"query must be at least 2 characters"}}}
```
### B-NEG-11 — autocomplete missing query -> 400
```
GET /search/autocomplete
HTTP 400  time=0.000812s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"query":"query is required"}}}
```
### B-NEG-12 — no results city=Nowhere -> 200 empty
```
GET /search/hotels
HTTP 200  time=0.017302s
{"success":true,"data":{"hotels":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPrevPage":false},"filters_applied":{"destinationId":null,"destinationType":null,"cityId":null,"countryId":null,"city":"Nowhere","country":null,"checkIn":"2026-10-11T00:00:00.000Z","checkOut":"2026-10-13T00:00:00.000Z","nights":2},"search_metadata":{"es_candidates":0,"available_hotels":0,"search_time_ms":16,"timestamp":"2026-10-09T13:21:15.497Z"},"filter_options":{"budget":{"min":null,"max":null},"amenities":{},"hotelClass":{},"reviewScores":{"3":0,"4":0,"4.5":0,"3.5":0},"popular":{"freeCancellation":0}},"suggestions":{"message":"No hotels found matching your criteria","alter
```
### B-NEG-13 — recent without auth -> 401
```
GET /search/recent
HTTP 401  time=0.001090s
{"success":false,"message":"Authentication required."}
```
### B-NEG-14 — log anonymous -> ?
```
POST /search/log
HTTP 201  time=0.005621s
{"success":true,"data":{"message":"Search log published for analytics","eventId":"18ab54f6-08e5-4b52-bb67-231bfea31788"}}
```
### B-SEC-01 — autocomplete XSS/regex query (<.*)
```
GET /search/autocomplete
HTTP 200  time=0.005403s
{"success":true,"data":{"suggestions":[]}}
```
### B-SEC-02 — autocomplete regex crash ( query
```
GET /search/autocomplete
HTTP 200  time=0.003698s
{"success":true,"data":{"suggestions":[]}}
```
## Performance (search x5)
  run1: 200 0.062532s
  run2: 200 0.059885s
  run3: 200 0.063783s
  run4: 200 0.065204s
  run5: 200 0.066275s
