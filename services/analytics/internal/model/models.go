package model

import "time"

type SearchLog struct {
	SearchID        string
	UserID          *string
	DestinationID   *string
	DestinationType string
	Latitude        *float64
	Longitude       *float64
	Radius          *int
	SearchTime      time.Time
	Adults          int
	Children        int
	Rooms           int
	CheckInDate     *time.Time
	CheckOutDate    *time.Time
	Nights          int
	IsDeleted       bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type HotelViewEvent struct {
	EventID   string
	HotelID   string
	UserID    *string
	SessionID string
	ViewedAt  time.Time
	IPAddress string
	UserAgent string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type TrendingHotel struct {
	HotelID string `json:"hotelId"`
	Views   int    `json:"views"`
}

type TrendingDestination struct {
	DestinationID   string `json:"destinationId"`
	DestinationType string `json:"destinationType"`
	SearchCount     int    `json:"searchCount"`
	UniqueUsers     int    `json:"uniqueUsers"`
}

type SearchDemand struct {
	CheckInDate     string  `json:"checkInDate"`
	DestinationID   string  `json:"destinationId"`
	DestinationType string  `json:"destinationType"`
	SearchCount     int     `json:"searchCount"`
	AvgNights       float64 `json:"avgNights"`
	AvgGuests       float64 `json:"avgGuests"`
}

type UserSearchSummary struct {
	UserID           string    `json:"userId"`
	TotalSearches    int       `json:"totalSearches"`
	LocationsVisited []string  `json:"locationsVisited"`
	LastSearchTime   time.Time `json:"lastSearchTime"`
	FirstSearchTime  time.Time `json:"firstSearchTime"`
	UniqueLocations  int       `json:"uniqueLocations"`
}

type UserSearch struct {
	SearchID     string     `json:"searchId"`
	CheckInDate  *time.Time `json:"checkInDate"`
	CheckOutDate *time.Time `json:"checkOutDate"`
	Adults       int        `json:"adults"`
	Children     int        `json:"children"`
	Rooms        int        `json:"rooms"`
	SearchTime   time.Time  `json:"searchTime"`
}
