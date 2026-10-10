The Inter-Clinic Blood Bank Balancer is a web platform that connects hospitals, clinics, and blood centers so they can share blood inventory in real time, replacing slow phone calls and manual coordination.

The Problems We Solve
Critical Shortages: When a facility urgently needs blood, the system automatically finds the nearest facility with a matching surplus, using geographic distance calculations to rank suppliers and estimate transit time.
Medical Waste: Blood units that are close to expiring (within 72 hours) get priority for transfer. A background process regularly checks batches and marks expired ones, ensuring fewer units spoil unused.

System Architecture & Reliability

Concurrency Control: Database row-level locking ensures that if two hospitals try to claim the same batch at the same moment, only one succeeds and the other gets a conflict error. Stock counts never go wrong.
Real-Time WebSockets: Live alerts for emergency requests, transfer updates, and expiry warnings are pushed directly to clinic dashboards without requiring page refreshes.
Role-Based Access Control (RBAC): Limits each facility’s staff to their own data, while granting regional administrators full network visibility.
External API Integration: Dedicated endpoints allow external Hospital Information Systems (HIS) to push their inventory records automatically.

Tech Stack
Backend: Python, FastAPI
Frontend: React, Interactive Mapping
Database: MySQL
