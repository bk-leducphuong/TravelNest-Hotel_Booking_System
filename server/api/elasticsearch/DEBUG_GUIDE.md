# Elasticsearch Search Debugging Guide

## Problem Summary

The Elasticsearch search was returning 0 results when using the city filter, even though hotels exist in the index for that city.

## Root Cause

The issue was in the `buildSearchQuery` method in `helpers/elasticsearch.helper.js`. The city filter was using a complex `bool` query with multiple `should` clauses that included:

1. **Exact term match** on `city.keyword` (case-sensitive)
2. **Fuzzy match** on `city` field
3. **Wildcard match** on `city.keyword`

The problem was that this complex query was placed in the `filter` context, which doesn't contribute to scoring and can cause unexpected behavior when combined with other filters.

## Solution

Changed the city filter from a complex `bool` query in the `filter` context to a simple `match` query in the `must` context:

```javascript
// OLD (PROBLEMATIC)
query.bool.filter.push({
  bool: {
    should: [
      { term: { 'city.keyword': city } },
      { match: { city: { query: city, fuzziness: 'AUTO' } } },
      { wildcard: { 'city.keyword': { value: `*${city}*`, case_insensitive: true } } }
    ],
    minimum_should_match: 1
  }
});

// NEW (FIXED)
query.bool.must.push({
  match: {
    city: {
      query: city,
      fuzziness: 'AUTO',
      operator: 'and'
    }
  }
});
```

## Why This Works

1. **Match query** is designed for full-text search and handles case-insensitivity automatically
2. **Fuzziness: AUTO** handles typos (1-2 character differences)
3. **Operator: and** ensures all terms in the query must match
4. **Must context** ensures the query contributes to scoring and is properly combined with filters

## Testing

### Test 1: Basic City Search
```http
POST http://localhost:9200/hotels/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "status.keyword": "active" } },
        { "term": { "is_available": true } },
        { "term": { "has_available_rooms": true } }
      ],
      "must": [
        { "match": { "city": { "query": "Irving", "fuzziness": "AUTO", "operator": "and" } } }
      ]
    }
  }
}
```

### Test 2: Verify Results
Run the test script:
```bash
node scripts/test-elasticsearch-query.js
```

### Test 3: Use HTTP Tests
Use the test.http file to run various test scenarios:
- Test 1: City filter with all filters
- Test 2: Simple city match
- Test 3: Match all (see what's in index)
- Test 4: Check mapping
- Test 5: Count documents
- Test 6: Aggregations to see all cities
- Test 7: Case variations

## Additional Improvements

### 1. Country Filter
The country filter also uses `term` on `country.keyword`. Consider if you need case-insensitive matching:

```javascript
// Current (case-sensitive)
{ term: { 'country.keyword': country } }

// Alternative (case-insensitive)
{ match: { country: { query: country, operator: 'and' } } }
```

### 2. Logging
Enable debug logging to see the actual queries being sent:

```javascript
// In config/elasticsearch.config.js
const client = new Client({
  // ...
  log: 'debug' // or 'trace' for more details
});
```

### 3. Index Mapping
Ensure your index has proper mapping for the `city` field:

```json
{
  "properties": {
    "city": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    }
  }
}
```

## Common Issues

### Issue 1: No Results with Filters
**Symptom**: Query returns results without filters but 0 with filters
**Solution**: Check that filter values match exactly (especially for `term` queries on keyword fields)

### Issue 2: Case Sensitivity
**Symptom**: "Irving" works but "irving" doesn't
**Solution**: Use `match` query instead of `term` query for text fields

### Issue 3: Wildcard Performance
**Symptom**: Slow queries with wildcards
**Solution**: Avoid leading wildcards (`*term`) and use proper text analysis instead

### Issue 4: Bool Query Complexity
**Symptom**: Unexpected results with nested bool queries
**Solution**: Simplify query structure and use appropriate contexts (must, filter, should)

## Best Practices

1. **Use `filter` context** for exact matches that don't need scoring (status, boolean flags)
2. **Use `must` context** for queries that should contribute to scoring (text search)
3. **Use `should` context** for optional criteria that boost relevance
4. **Avoid complex nested bool queries** when simpler alternatives exist
5. **Test queries directly** in Elasticsearch before implementing in code
6. **Enable logging** during development to debug query issues
7. **Use aggregations** to understand your data distribution

## Monitoring

### Check Elasticsearch Health
```bash
curl -X GET "localhost:9200/_cluster/health?pretty"
```

### Check Index Stats
```bash
curl -X GET "localhost:9200/hotels/_stats?pretty"
```

### View Slow Queries
```bash
curl -X GET "localhost:9200/hotels/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "profile": true,
  "query": { ... }
}
'
```

## Resources

- [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Match Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html)
- [Bool Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html)
- [Term vs Match](https://www.elastic.co/guide/en/elasticsearch/reference/current/term-vs-full-text.html)
