# BIQ Backend - Django REST API

This is the backend for the BIQ frontend application, built with Django and Django REST Framework.

## Setup

### Prerequisites
- Python 3.8+
- pip

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/Scripts/activate  # On Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create a superuser:
```bash
python manage.py createsuperuser
```

6. Run the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Endpoints

### Businesses
- `GET /api/businesses/` - List all businesses
- `POST /api/businesses/` - Create a new business
- `GET /api/businesses/{id}/` - Retrieve a specific business
- `PUT /api/businesses/{id}/` - Update a business
- `DELETE /api/businesses/{id}/` - Delete a business
- `GET /api/businesses/{id}/dashboards/` - Get dashboards for a business

### Dashboards
- `GET /api/dashboards/` - List all dashboards
- `POST /api/dashboards/` - Create a new dashboard
- `GET /api/dashboards/{id}/` - Retrieve a specific dashboard
- `PUT /api/dashboards/{id}/` - Update a dashboard
- `DELETE /api/dashboards/{id}/` - Delete a dashboard

Query parameters:
- `business_id` - Filter dashboards by business ID

## Admin Panel

Access the Django admin panel at `http://localhost:8000/admin/` with your superuser credentials.

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000` (React default)
- `http://localhost:5173` (Vite default)

Update `CORS_ALLOWED_ORIGINS` in `config/settings.py` for production.
