## Purpose

Remembers what Gina has learned about each customer across turns and across separate sessions, so a customer never has to repeat information they already gave, even after the process restarts.

## ADDED Requirements

### Requirement: Customer identity
The system SHALL identify a customer by the combination of platform and platform-specific user id, creating a new customer record with all optional fields unset the first time that combination is seen.

#### Scenario: First message from a new customer
- **WHEN** no customer record exists for a given platform and platform user id
- **THEN** the system SHALL create a new customer record with destination, travel_date, people, interest, and budget all unset

### Requirement: Additive memory merge
The system SHALL only fill a customer's stored field when it is currently unset. It SHALL NOT overwrite a field that already has a value, even if a later message's extraction returns null or a different value for that field.

#### Scenario: Later message omits previously known information
- **WHEN** a customer's destination has already been recorded, and a later message's extraction returns null for destination
- **THEN** the stored destination SHALL remain unchanged

### Requirement: Cross-session persistence
The system SHALL persist each customer's profile in durable storage such that information learned in one process run is available to a subsequent, independent process run for the same customer.

#### Scenario: Customer returns in a new process
- **WHEN** a new process looks up an existing customer by the same platform and platform user id
- **THEN** it SHALL return the previously stored profile, including every field learned in earlier sessions

### Requirement: Conversation history log
The system SHALL record every message exchanged with a customer, in the order it occurred, associated with that customer.

#### Scenario: Retrieving recent history for a customer
- **WHEN** recent messages are requested for a customer
- **THEN** they SHALL be returned in chronological order, oldest first
