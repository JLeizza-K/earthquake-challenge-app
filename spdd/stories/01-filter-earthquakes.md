# Story 1: Filter and view earthquakes on the map

## Description

As a person monitoring seismic activity, I want to filter earthquakes by date
range and minimum magnitude, so that I can see on the map only the events that
matter to me.

## Scope

- In: filter form (starttime, endtime, minmagnitude); submit → fetch USGS API;
  render results as points on the map; loading / empty / error states; input validation.
- Out: marker sizing by magnitude (Story 2); popups (Story 2); responsive layout
  (Story 3); caching (bonus).

## Acceptance Criteria

### AC1 — Validation: start date after end date

Given the user sets a start date later than the end date,
When they submit the form,
Then a field-level error is shown,
And no request is made to the API.

### AC2 — Validation: missing field or magnitude out of range

Given the user leaves a required field empty or enters a magnitude outside the valid range,
When they submit the form,
Then a field-level error is shown,
And no request is made to the API.

### AC3 — Happy path: results found

Given valid filters that match earthquakes,
When the user submits the form,
Then a loading indicator is shown while fetching,
And the matching earthquakes are rendered as points on the map.

### AC4 — Empty results

Given valid filters that match no earthquakes,
When the user submits the form,
Then a clear empty state is shown ("No earthquakes found"),
And no points are rendered.

### AC5 — API error

Given the USGS API fails or is unreachable,
When the user submits the form,
Then a clear error state is shown,
And the user can retry.

### AC6 — Validation: invalid input

Given the user enters invalid information, such as letters or special characters
When they submit the form,
Then a field-level error is shown,
And no request is made to the API.
