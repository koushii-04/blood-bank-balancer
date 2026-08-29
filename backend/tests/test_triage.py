import pytest
from backend.app.services.triage_service import (
    calculate_haversine_distance,
    estimate_transit_time_minutes,
    calculate_triage_priority_score
)

def test_haversine_distance_known_coordinates():
    # Test known coordinates: Bangalore MG Road (12.9716, 77.5946) to Koramangala (12.9352, 77.6245)
    # Expected distance is approx ~5.17 km
    dist = calculate_haversine_distance(12.9716, 77.5946, 12.9352, 77.6245)
    assert 5.0 <= dist <= 5.5, f"Expected distance ~5.17 km, got {dist}"

def test_haversine_zero_distance():
    # Distance between identical points should be 0.0
    dist = calculate_haversine_distance(12.9716, 77.5946, 12.9716, 77.5946)
    assert dist == 0.0

def test_transit_time_estimation():
    dist_10km = 10.0
    time_est = estimate_transit_time_minutes(dist_10km)
    # 10km at 40km/h is 15 min + 10 min dispatch = 25 min
    assert time_est == 25

def test_triage_expiry_priority_boost():
    # Batch expiring in 2 days should have higher priority (lower score) than batch expiring in 20 days at same distance
    dist = 10.0
    score_urgent = calculate_triage_priority_score(dist, days_until_expiry=2)
    score_normal = calculate_triage_priority_score(dist, days_until_expiry=20)
    
    assert score_urgent < score_normal
    assert score_urgent == -15.0  # 10.0 - 25.0
    assert score_normal == 10.0
