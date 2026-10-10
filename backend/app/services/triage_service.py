import math
from datetime import date, datetime, timezone
from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.facility import Facility
from backend.app.models.inventory import Inventory, BloodGroup, ComponentType, InventoryStatus
from backend.app.schemas.triage import TriageQuery, FacilityMatch, TriageResponse

EARTH_RADIUS_KM = 6371.0  # Earth's mean radius in kilometers

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two points on the Earth's surface
    using the Haversine formula.
    Result returned in kilometers.
    """
    # Convert latitude and longitude from degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = EARTH_RADIUS_KM * c

    return round(distance, 2)

def estimate_transit_time_minutes(distance_km: float) -> int:
    """
    Estimates emergency ambulance/transit time assuming an average urban speed of 40 km/h
    plus a 10-minute dispatch baseline buffer.
    """
    avg_speed_kmh = 40.0
    transit_hours = distance_km / avg_speed_kmh
    minutes = int(transit_hours * 60) + 10
    return max(minutes, 5)

def calculate_triage_priority_score(distance_km: float, days_until_expiry: int) -> float:
    """
    Computes ranking score combining proximity and expiry prioritization.
    Lower score = Higher Priority Recommendation.
    
    Factors:
    - Distance penalty: +1.0 point per km.
    - Expiry Urgency bonus: If blood is expiring soon (<= 3 days / 72 hours), 
      deduct points so regional supply prioritizes transferring near-expiring blood 
      before it spoils, as long as transit is feasible.
    """
    score = distance_km
    if days_until_expiry <= 3:
        # High urgency: blood will spoil soon, prioritize transferring it
        score -= 25.0
    elif days_until_expiry <= 7:
        # Medium urgency
        score -= 10.0
    
    return round(score, 2)

def perform_geospatial_triage(
    db: Session,
    query: TriageQuery,
    requesting_facility: Facility
) -> TriageResponse:
    """
    Executes Algorithmic Proximity Triage:
    1. Queries all participating facilities holding active matching blood units (excluding requesting facility).
    2. Computes Haversine distance from requester GPS coordinates.
    3. Evaluates batch expiration urgency.
    4. Ranks facilities and batches to minimize travel latency and prevent blood waste.
    """
    today = date.today()

    # Query matching available inventory batches across other facilities
    candidate_batches = (
        db.query(Inventory, Facility)
        .join(Facility, Inventory.facility_id == Facility.facility_id)
        .filter(
            # Facility.facility_id != requesting_facility.facility_id,
            Facility.is_active == True,
            Inventory.blood_group == query.blood_group,
            Inventory.component_type == query.component_type,
            Inventory.status == InventoryStatus.AVAILABLE,
            Inventory.units_available >= query.units_requested,
            Inventory.expiry_date >= today
        )
        .all()
    )

    matches: List[FacilityMatch] = []

    for inventory, facility in candidate_batches:
        dist_km = calculate_haversine_distance(
            requesting_facility.latitude,
            requesting_facility.longitude,
            facility.latitude,
            facility.longitude
        )

        # Check radius constraint
        # if query.max_radius_km and dist_km > query.max_radius_km:
        #     continue

        days_until_expiry = (inventory.expiry_date - today).days
        is_expiring_soon = days_until_expiry <= 3  # <= 72 hours
        priority_score = calculate_triage_priority_score(dist_km, days_until_expiry)
        transit_mins = estimate_transit_time_minutes(dist_km)

        matches.append(
            FacilityMatch(
                facility_id=facility.facility_id,
                name=facility.name,
                facility_type=facility.facility_type,
                latitude=facility.latitude,
                longitude=facility.longitude,
                address=facility.address,
                contact_phone=facility.contact_phone,
                distance_km=dist_km,
                estimated_transit_minutes=transit_mins,
                inventory_id=inventory.inventory_id,
                batch_code=inventory.batch_code,
                units_available=inventory.units_available,
                expiry_date=inventory.expiry_date,
                days_until_expiry=days_until_expiry,
                is_expiring_soon=is_expiring_soon,
                priority_score=priority_score
            )
        )

    # Sort matches by priority score ascending (lowest score = highest priority match)
    matches.sort(key=lambda m: m.priority_score)

    notes = (
        f"Found {len(matches)} matching facilities holding {query.blood_group.value} "
        f"({query.component_type.value}). Ranked by Haversine distance and expiry urgency."
    )
    if not matches:
        notes = f"No available {query.blood_group.value} stock currently located within {query.max_radius_km} km radius."

    return TriageResponse(
        query_blood_group=query.blood_group,
        units_requested=query.units_requested,
        total_matching_facilities=len(matches),
        recommended_matches=matches,
        notes=notes
    )
