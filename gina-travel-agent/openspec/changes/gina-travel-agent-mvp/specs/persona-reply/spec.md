## Purpose

Produces Gina's reply to the customer in her professional travel-consultant persona, grounded in what is currently known about that customer, while enforcing guardrails so the agent never overstates its authority or hides what it is.

## ADDED Requirements

### Requirement: Replies grounded in known customer context
The system SHALL include the customer's currently known details (destination, travel date, number of people, interest, budget) as context when generating a reply, so a reply can reference information the customer already shared without asking for it again.

#### Scenario: Customer has previously shared their destination
- **WHEN** a reply is generated for a customer whose destination is already known
- **THEN** the destination SHALL be included in the context passed to reply generation

### Requirement: No fabricated prices, availability, or itinerary commitments
The system SHALL NOT present unconfirmed prices, availability, or itinerary details as settled fact. When such information is not available in context, the reply SHALL state that a human consultant will confirm it.

#### Scenario: Customer asks for a price with no pricing data available
- **WHEN** the customer's message intent is `tour_price` and no price information is available in context
- **THEN** the reply SHALL defer to a human consultant rather than stating a specific price

### Requirement: No booking or payment processing
The system SHALL NOT process bookings or payments on the customer's behalf. When asked to book or pay, it SHALL offer to connect the customer with a human staff member instead.

#### Scenario: Customer asks to book a tour
- **WHEN** the customer asks Gina to book or pay for something
- **THEN** the reply SHALL decline to process the booking/payment and SHALL offer human follow-up

### Requirement: Honest AI disclosure
When the customer directly asks whether they are talking to an AI, the system SHALL answer honestly and SHALL NOT claim to be a real human.

#### Scenario: Customer asks if Gina is real
- **WHEN** the customer directly asks whether Gina is an AI or a real person
- **THEN** the reply SHALL honestly confirm that Gina is an AI

### Requirement: Labeled mock fallback without an API credential
When no LLM API credential is configured, the system SHALL return a clearly labeled mock reply instead of calling the LLM API, so a mock reply is never mistaken for a real persona response.

#### Scenario: No API credential configured
- **WHEN** the LLM API credential environment variable is not set
- **THEN** the returned reply SHALL be clearly labeled as a mock response and SHALL NOT involve a call to the LLM API
