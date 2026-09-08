## Purpose

Determines the customer's intent and any travel-planning details from a single incoming message, in one pass, so the rest of the system never has to guess what the customer meant or re-derive it later.

## ADDED Requirements

### Requirement: Intent classification
The system SHALL classify every incoming customer message into exactly one of the following intents: `travel_planning`, `tour_price`, `hotel_recommendation`, `itinerary_question`, `media_request`, `general_inquiry`.

#### Scenario: Message does not match a specific category
- **WHEN** a customer message does not clearly match any of the specific intent categories
- **THEN** the system SHALL classify it as `general_inquiry`

### Requirement: No invented travel details
The system SHALL extract only travel-planning details (destination, product, travel date, number of people, interest, budget) that the customer explicitly stated in the message, and SHALL return null for any field not explicitly mentioned.

#### Scenario: Message contains no travel details
- **WHEN** a customer message contains a question but does not mention a destination, date, number of people, interest, or budget
- **THEN** all of destination, product, travel_date, people, interest, and budget SHALL be null in the extraction result

### Requirement: Single extraction round trip
The system SHALL determine both the intent and the travel-planning details for one customer message using a single request to the underlying extraction service, rather than one request per concern.

#### Scenario: One message, one extraction call
- **WHEN** a single customer message is processed
- **THEN** the system SHALL perform at most one call to the extraction service (zero when operating without a configured API credential) to obtain both the intent and the travel details

### Requirement: Local fallback without an API credential
When no LLM API credential is configured, the system SHALL still return an intent and a set of travel-planning fields (using local, rule-based logic), without making any external API call.

#### Scenario: No API credential configured
- **WHEN** the LLM API credential environment variable is not set
- **THEN** the system SHALL return an intent and extracted travel details derived entirely from local rules, and SHALL NOT contact the LLM API
