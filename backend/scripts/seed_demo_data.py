#!/usr/bin/env python3
"""
Seed script to populate the database with demo data for Spain Aikikai Admin.

Run with: poetry run python scripts/seed_demo_data.py
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from typing import List
import random

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

import motor.motor_asyncio
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# Database connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "spainaikikai")


async def clear_collections(db):
    """Clear all collections before seeding."""
    collections = [
        "associations", "clubs", "members", "licenses",
        "insurances", "payments", "seminars", "users"
    ]
    for collection in collections:
        await db[collection].delete_many({})
    print("Cleared all collections")


async def seed_association(db) -> str:
    """Seed the main association."""
    association = {
        "name": "Spain Aikikai",
        "address": "Calle Gran Via 45, 3A",
        "city": "Madrid",
        "province": "Madrid",
        "postal_code": "28013",
        "country": "Spain",
        "phone": "+34 915 123 456",
        "email": "info@spainaikikai.es",
        "cif": "G12345678",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.associations.insert_one(association)
    print(f"Created association: {association['name']}")
    return str(result.inserted_id)


async def seed_clubs(db, association_id: str) -> List[str]:
    """Seed clubs across Spain."""
    clubs = [
        {
            "name": "Aikido Dojo Central Madrid",
            "address": "Calle Alcala 150",
            "city": "Madrid",
            "province": "Madrid",
            "postal_code": "28009",
            "country": "Spain",
            "phone": "+34 915 234 567",
            "email": "central@aikido-madrid.es",
            "association_id": association_id,
            "is_active": True,
        },
        {
            "name": "Club Aikido Barcelona",
            "address": "Carrer de Valencia 234",
            "city": "Barcelona",
            "province": "Barcelona",
            "postal_code": "08007",
            "country": "Spain",
            "phone": "+34 932 345 678",
            "email": "info@aikido-barcelona.es",
            "association_id": association_id,
            "is_active": True,
        },
        {
            "name": "Aikikai Valencia",
            "address": "Avenida del Puerto 89",
            "city": "Valencia",
            "province": "Valencia",
            "postal_code": "46023",
            "country": "Spain",
            "phone": "+34 963 456 789",
            "email": "contacto@aikikai-valencia.es",
            "association_id": association_id,
            "is_active": True,
        },
        {
            "name": "Dojo Aikido Sevilla",
            "address": "Calle Sierpes 78",
            "city": "Sevilla",
            "province": "Sevilla",
            "postal_code": "41004",
            "country": "Spain",
            "phone": "+34 954 567 890",
            "email": "dojo@aikido-sevilla.es",
            "association_id": association_id,
            "is_active": True,
        },
        {
            "name": "Aikido Norte Bilbao",
            "address": "Gran Via 56",
            "city": "Bilbao",
            "province": "Vizcaya",
            "postal_code": "48011",
            "country": "Spain",
            "phone": "+34 944 678 901",
            "email": "info@aikido-bilbao.es",
            "association_id": association_id,
            "is_active": True,
        },
    ]

    club_ids = []
    for club in clubs:
        club["created_at"] = datetime.utcnow()
        club["updated_at"] = datetime.utcnow()
        result = await db.clubs.insert_one(club)
        club_ids.append(str(result.inserted_id))
        print(f"  Created club: {club['name']}")

    return club_ids


async def seed_members(db, club_ids: List[str]) -> List[dict]:
    """Seed members distributed across clubs."""

    first_names_male = [
        "Carlos", "Miguel", "Antonio", "Jose", "Francisco", "David", "Juan",
        "Pedro", "Luis", "Rafael", "Manuel", "Pablo", "Alberto", "Fernando"
    ]
    first_names_female = [
        "Maria", "Carmen", "Ana", "Laura", "Isabel", "Sofia", "Elena",
        "Paula", "Lucia", "Marta", "Rosa", "Teresa", "Cristina", "Patricia"
    ]
    last_names = [
        "Garcia", "Rodriguez", "Martinez", "Lopez", "Gonzalez", "Hernandez",
        "Perez", "Sanchez", "Ramirez", "Torres", "Flores", "Rivera", "Gomez",
        "Diaz", "Reyes", "Moreno", "Jimenez", "Ruiz", "Alvarez", "Romero"
    ]

    cities_by_province = {
        "Madrid": ["Madrid", "Alcobendas", "Getafe", "Leganes"],
        "Barcelona": ["Barcelona", "Hospitalet", "Badalona", "Terrassa"],
        "Valencia": ["Valencia", "Torrent", "Gandia", "Paterna"],
        "Sevilla": ["Sevilla", "Dos Hermanas", "Alcala de Guadaira"],
        "Vizcaya": ["Bilbao", "Barakaldo", "Getxo", "Portugalete"]
    }

    provinces = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Vizcaya"]
    statuses = ["active", "active", "active", "active", "inactive", "pending"]

    members = []
    member_data = []

    for i in range(35):
        is_male = random.random() > 0.4
        first_name = random.choice(first_names_male if is_male else first_names_female)
        last_name1 = random.choice(last_names)
        last_name2 = random.choice(last_names)

        club_idx = i % len(club_ids)
        province = provinces[club_idx]
        city = random.choice(cities_by_province[province])

        birth_year = random.randint(1960, 2005)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)

        registration_days_ago = random.randint(30, 1500)

        member = {
            "first_name": first_name,
            "last_name": f"{last_name1} {last_name2}",
            "dni": f"{random.randint(10000000, 99999999)}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}",
            "email": f"{first_name.lower()}.{last_name1.lower()}{random.randint(1,99)}@email.com",
            "phone": f"+34 6{random.randint(10, 99)} {random.randint(100, 999)} {random.randint(100, 999)}",
            "address": f"Calle {random.choice(['Mayor', 'Principal', 'Nueva', 'Real', 'San Juan', 'Santa Maria'])} {random.randint(1, 150)}",
            "city": city,
            "province": province,
            "postal_code": f"{random.randint(10000, 50000)}",
            "country": "Spain",
            "birth_date": datetime(birth_year, birth_month, birth_day),
            "club_id": club_ids[club_idx],
            "status": random.choice(statuses),
            "registration_date": datetime.utcnow() - timedelta(days=registration_days_ago),
            "created_at": datetime.utcnow() - timedelta(days=registration_days_ago),
            "updated_at": datetime.utcnow()
        }
        members.append(member)

    result = await db.members.insert_many(members)

    for i, member_id in enumerate(result.inserted_ids):
        member_data.append({
            "id": str(member_id),
            "club_id": members[i]["club_id"],
            "name": f"{members[i]['first_name']} {members[i]['last_name']}",
            "status": members[i]["status"]
        })

    print(f"  Created {len(members)} members")
    return member_data


async def seed_licenses(db, members: List[dict], association_id: str):
    """Seed licenses for active members."""

    license_types = ["kyu", "kyu", "kyu", "dan", "dan", "instructor"]
    kyu_grades = ["6th Kyu", "5th Kyu", "4th Kyu", "3rd Kyu", "2nd Kyu", "1st Kyu"]
    dan_grades = ["1st Dan", "2nd Dan", "3rd Dan", "4th Dan", "5th Dan"]

    licenses = []
    license_num = 2024001

    for member in members:
        if member["status"] != "active":
            continue

        license_type = random.choice(license_types)

        if license_type == "kyu":
            grade = random.choice(kyu_grades)
        elif license_type == "dan":
            grade = random.choice(dan_grades)
        else:
            grade = random.choice(dan_grades[:3]) + " - Instructor"

        days_until_expiry = random.randint(-30, 365)
        issue_date = datetime.utcnow() - timedelta(days=random.randint(100, 800))
        expiration_date = datetime.utcnow() + timedelta(days=days_until_expiry)

        status = "active" if days_until_expiry > 0 else "expired"

        license_doc = {
            "license_number": f"SA-{license_num}",
            "member_id": member["id"],
            "club_id": member["club_id"],
            "association_id": association_id,
            "license_type": license_type,
            "grade": grade,
            "status": status,
            "issue_date": issue_date,
            "expiration_date": expiration_date,
            "renewal_date": None,
            "is_renewed": False,
            "created_at": issue_date,
            "updated_at": datetime.utcnow()
        }
        licenses.append(license_doc)
        license_num += 1

    if licenses:
        await db.licenses.insert_many(licenses)
    print(f"  Created {len(licenses)} licenses")


async def seed_insurances(db, members: List[dict]):
    """Seed insurance policies for members."""

    insurance_companies = [
        "Mapfre Seguros", "Allianz Espana", "AXA Seguros",
        "Generali Seguros", "Zurich Insurance"
    ]

    insurances = []
    policy_num = 100001

    for member in members:
        if member["status"] != "active":
            continue

        # Accident insurance (most members have this)
        if random.random() > 0.1:
            days_until_expiry = random.randint(-15, 365)
            start_date = datetime.utcnow() - timedelta(days=random.randint(30, 365))
            end_date = datetime.utcnow() + timedelta(days=days_until_expiry)

            status = "active" if days_until_expiry > 0 else "expired"

            accident_insurance = {
                "member_id": member["id"],
                "club_id": member["club_id"],
                "insurance_type": "accident",
                "policy_number": f"ACC-{policy_num}",
                "insurance_company": random.choice(insurance_companies),
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
                "coverage_amount": random.choice([50000.0, 75000.0, 100000.0]),
                "payment_id": None,
                "documents": None,
                "created_at": start_date,
                "updated_at": datetime.utcnow()
            }
            insurances.append(accident_insurance)
            policy_num += 1

        # Civil liability insurance (some members)
        if random.random() > 0.6:
            days_until_expiry = random.randint(-10, 365)
            start_date = datetime.utcnow() - timedelta(days=random.randint(30, 365))
            end_date = datetime.utcnow() + timedelta(days=days_until_expiry)

            status = "active" if days_until_expiry > 0 else "expired"

            civil_insurance = {
                "member_id": member["id"],
                "club_id": member["club_id"],
                "insurance_type": "civil_liability",
                "policy_number": f"CIV-{policy_num}",
                "insurance_company": random.choice(insurance_companies),
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
                "coverage_amount": random.choice([100000.0, 150000.0, 300000.0]),
                "payment_id": None,
                "documents": None,
                "created_at": start_date,
                "updated_at": datetime.utcnow()
            }
            insurances.append(civil_insurance)
            policy_num += 1

    if insurances:
        await db.insurances.insert_many(insurances)
    print(f"  Created {len(insurances)} insurance policies")


async def seed_payments(db, members: List[dict]):
    """Seed payment records."""

    payment_types = ["annual_quota", "license", "seminar", "accident_insurance", "civil_liability_insurance"]
    payment_statuses = ["completed", "completed", "completed", "pending", "failed"]

    payments = []

    for member in members:
        # Annual quota payments
        num_payments = random.randint(1, 4)
        for i in range(num_payments):
            days_ago = random.randint(1, 730)
            payment_date = datetime.utcnow() - timedelta(days=days_ago)
            status = random.choice(payment_statuses)

            payment = {
                "member_id": member["id"],
                "club_id": member["club_id"],
                "payment_type": random.choice(payment_types),
                "amount": random.choice([45.0, 60.0, 75.0, 90.0, 120.0, 150.0]),
                "status": status,
                "payment_date": payment_date if status == "completed" else None,
                "transaction_id": f"TXN-{random.randint(100000, 999999)}" if status == "completed" else None,
                "redsys_response": None,
                "error_message": "Payment declined by bank" if status == "failed" else None,
                "refund_amount": None,
                "refund_date": None,
                "related_entity_id": None,
                "created_at": payment_date,
                "updated_at": datetime.utcnow()
            }
            payments.append(payment)

    if payments:
        await db.payments.insert_many(payments)
    print(f"  Created {len(payments)} payments")


async def seed_seminars(db, club_ids: List[str], association_id: str):
    """Seed seminars (upcoming, ongoing, completed)."""

    instructors = [
        "Sensei Yamada Yoshimitsu",
        "Sensei Tamura Nobuyoshi",
        "Sensei Tissier Christian",
        "Sensei Fujita Masatake",
        "Sensei Sugano Seiichi",
        "Sensei Endo Seishiro"
    ]

    venues_by_city = {
        "Madrid": ["Polideportivo Municipal La Latina", "Centro Deportivo Canal", "Dojo Central Madrid"],
        "Barcelona": ["Palau Sant Jordi - Sala B", "Centre Esportiu Municipal Perill", "Club Aikido Barcelona"],
        "Valencia": ["Ciudad de las Artes - Sala Polivalente", "Pabellon Municipal Fuente San Luis"],
        "Sevilla": ["Palacio de Deportes San Pablo", "Centro Deportivo San Jeronimo"],
        "Bilbao": ["Bilbao Arena", "Polideportivo de Deusto"]
    }

    cities = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"]

    seminars = []

    # Past seminars (completed)
    for i in range(8):
        city = random.choice(cities)
        days_ago = random.randint(30, 365)
        start_date = datetime.utcnow() - timedelta(days=days_ago)
        duration_days = random.choice([1, 2, 3])
        end_date = start_date + timedelta(days=duration_days)
        max_participants = random.choice([25, 30, 40, 50])

        seminar = {
            "title": f"Seminario de Aikido {random.choice(['Avanzado', 'Tradicional', 'Internacional', 'Tecnico'])}",
            "description": f"Seminario impartido por {random.choice(instructors)} enfocado en tecnicas {'avanzadas' if random.random() > 0.5 else 'fundamentales'} de Aikido.",
            "instructor_name": random.choice(instructors),
            "venue": random.choice(venues_by_city[city]),
            "address": f"Calle {random.choice(['Principal', 'Mayor', 'Nueva'])} {random.randint(1, 100)}",
            "city": city,
            "province": city if city != "Bilbao" else "Vizcaya",
            "start_date": start_date,
            "end_date": end_date,
            "price": random.choice([35.0, 45.0, 60.0, 75.0, 90.0]),
            "max_participants": max_participants,
            "current_participants": random.randint(int(max_participants * 0.6), max_participants),
            "club_id": club_ids[cities.index(city)],
            "association_id": association_id,
            "status": "completed",
            "created_at": start_date - timedelta(days=60),
            "updated_at": end_date
        }
        seminars.append(seminar)

    # Upcoming seminars
    upcoming_seminars = [
        {
            "title": "Seminario de Aikido con Sensei Yamada",
            "description": "Seminario internacional con Sensei Yamada Yoshimitsu (8o Dan). Enfoque en ukemi y tecnicas de proyeccion avanzadas.",
            "instructor_name": "Sensei Yamada Yoshimitsu",
            "venue": "Polideportivo Municipal La Latina",
            "address": "Calle Toledo 180",
            "city": "Madrid",
            "province": "Madrid",
            "start_date": datetime.utcnow() + timedelta(days=15),
            "end_date": datetime.utcnow() + timedelta(days=17),
            "price": 90.0,
            "max_participants": 50,
            "current_participants": 32,
            "club_id": club_ids[0],
            "association_id": association_id,
            "status": "upcoming",
        },
        {
            "title": "Taller de Tecnicas Basicas",
            "description": "Taller dirigido a principiantes y practicantes de nivel intermedio. Revision de tecnicas basicas y fundamentos.",
            "instructor_name": "Sensei Garcia Martinez",
            "venue": "Centre Esportiu Municipal Perill",
            "address": "Carrer del Perill 16",
            "city": "Barcelona",
            "province": "Barcelona",
            "start_date": datetime.utcnow() + timedelta(days=25),
            "end_date": datetime.utcnow() + timedelta(days=25),
            "price": 35.0,
            "max_participants": 30,
            "current_participants": 18,
            "club_id": club_ids[1],
            "association_id": association_id,
            "status": "upcoming",
        },
        {
            "title": "Seminario Nacional de Aikido",
            "description": "Seminario anual de la federacion con multiples instructores. Examenes de grado incluidos.",
            "instructor_name": "Varios Instructores",
            "venue": "Ciudad de las Artes - Sala Polivalente",
            "address": "Av. del Professor Lopez Pinero 7",
            "city": "Valencia",
            "province": "Valencia",
            "start_date": datetime.utcnow() + timedelta(days=45),
            "end_date": datetime.utcnow() + timedelta(days=47),
            "price": 120.0,
            "max_participants": 100,
            "current_participants": 67,
            "club_id": club_ids[2],
            "association_id": association_id,
            "status": "upcoming",
        },
        {
            "title": "Curso de Armas: Jo y Bokken",
            "description": "Curso intensivo de trabajo con armas tradicionales. Abierto a todos los niveles.",
            "instructor_name": "Sensei Lopez Fernandez",
            "venue": "Dojo Aikido Sevilla",
            "address": "Calle Sierpes 78",
            "city": "Sevilla",
            "province": "Sevilla",
            "start_date": datetime.utcnow() + timedelta(days=60),
            "end_date": datetime.utcnow() + timedelta(days=61),
            "price": 55.0,
            "max_participants": 25,
            "current_participants": 8,
            "club_id": club_ids[3],
            "association_id": association_id,
            "status": "upcoming",
        },
    ]

    for seminar in upcoming_seminars:
        seminar["created_at"] = datetime.utcnow() - timedelta(days=30)
        seminar["updated_at"] = datetime.utcnow()
        seminars.append(seminar)

    if seminars:
        await db.seminars.insert_many(seminars)
    print(f"  Created {len(seminars)} seminars")


async def seed_users(db, club_ids: List[str]):
    """Seed user accounts for testing."""

    users = [
        {
            "email": "admin@spainaikikai.es",
            "username": "admin",
            "hashed_password": get_password_hash("admin123"),
            "is_active": True,
            "role": "association_admin",
            "club_id": None,
        },
        {
            "email": "director@aikido-madrid.es",
            "username": "director_madrid",
            "hashed_password": get_password_hash("demo123"),
            "is_active": True,
            "role": "club_admin",
            "club_id": club_ids[0],
        },
        {
            "email": "director@aikido-barcelona.es",
            "username": "director_barcelona",
            "hashed_password": get_password_hash("demo123"),
            "is_active": True,
            "role": "club_admin",
            "club_id": club_ids[1],
        },
        {
            "email": "instructor@aikido-valencia.es",
            "username": "instructor_valencia",
            "hashed_password": get_password_hash("demo123"),
            "is_active": True,
            "role": "club_admin",
            "club_id": club_ids[2],
        },
        {
            "email": "demo@spainaikikai.es",
            "username": "demo",
            "hashed_password": get_password_hash("demo123"),
            "is_active": True,
            "role": "association_admin",
            "club_id": None,
        },
    ]

    for user in users:
        user["created_at"] = datetime.utcnow()
        user["updated_at"] = datetime.utcnow()

    await db.users.insert_many(users)
    print(f"  Created {len(users)} users")


async def main():
    """Main seed function."""
    print("\n" + "="*60)
    print("  SPAIN AIKIKAI ADMIN - Demo Data Seeder")
    print("="*60 + "\n")

    print(f"Connecting to MongoDB: {MONGODB_URL}")
    print(f"Database: {DATABASE_NAME}\n")

    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]

    try:
        # Test connection
        await client.admin.command('ping')
        print("Successfully connected to MongoDB!\n")

        # Clear existing data
        print("Step 1: Clearing existing data...")
        await clear_collections(db)

        # Seed data
        print("\nStep 2: Creating Association...")
        association_id = await seed_association(db)

        print("\nStep 3: Creating Clubs...")
        club_ids = await seed_clubs(db, association_id)

        print("\nStep 4: Creating Members...")
        members = await seed_members(db, club_ids)

        print("\nStep 5: Creating Licenses...")
        await seed_licenses(db, members, association_id)

        print("\nStep 6: Creating Insurance Policies...")
        await seed_insurances(db, members)

        print("\nStep 7: Creating Payments...")
        await seed_payments(db, members)

        print("\nStep 8: Creating Seminars...")
        await seed_seminars(db, club_ids, association_id)

        print("\nStep 9: Creating Users...")
        await seed_users(db, club_ids)

        print("\n" + "="*60)
        print("  SEED COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\nDemo Accounts:")
        print("-"*40)
        print("  Admin:      admin@spainaikikai.es / admin123")
        print("  Demo:       demo@spainaikikai.es / demo123")
        print("  Club Dir:   director@aikido-madrid.es / demo123")
        print("-"*40 + "\n")

    except Exception as e:
        print(f"\nError during seeding: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
