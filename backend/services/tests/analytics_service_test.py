"""
Unit tests for Analytics Service

Tests calculation logic for utilization, revenue, maintenance costs, and analytics aggregation.
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta, timezone
from backend.services.analytics_service import (
    calculate_current_month_utilization,
    calculate_month_utilization,
    calculate_month_net_income,
    calculate_month_maintenance_costs,
    get_car_analytics,
    get_fleet_analytics,
    get_analytics_service
)


class TestCalculateCurrentMonthUtilization:
    """Tests for current month utilization calculation"""
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_current_month_utilization_no_cars(self, mock_supabase):
        """Test utilization calculation when company has no cars"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        result = await calculate_current_month_utilization(company_id=1)
        
        assert result == 0.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_current_month_utilization_no_rentals(self, mock_supabase):
        """Test utilization when cars exist but no rentals"""
        # Mock cars
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"car_id": 1},
            {"car_id": 2},
            {"car_id": 3}
        ]
        
        # Mock no rentals
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = []
        
        result = await calculate_current_month_utilization(company_id=1)
        
        assert result == 0.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_current_month_utilization_partial(self, mock_supabase):
        """Test utilization with some cars rented"""
        now = datetime.now()
        month_start = now.replace(day=1)
        
        # Mock 3 cars
        cars_data = [{"car_id": 1}, {"car_id": 2}, {"car_id": 3}]
        
        # Mock 2 active rentals (2 out of 3 cars = 66.67%)
        rentals_data = [
            {
                "car_id": 1,
                "rental_start_date": month_start.isoformat(),
                "rental_end_date": (now + timedelta(days=5)).isoformat()
            },
            {
                "car_id": 2,
                "rental_start_date": (now - timedelta(days=2)).isoformat(),
                "rental_end_date": (now + timedelta(days=3)).isoformat()
            }
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = cars_data
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = rentals_data
        
        result = await calculate_current_month_utilization(company_id=1)
        
        # 2 out of 3 cars rented = 66.67%
        assert result == pytest.approx(66.67, rel=0.01)
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_current_month_utilization_full(self, mock_supabase):
        """Test 100% utilization when all cars are rented"""
        now = datetime.now()
        month_start = now.replace(day=1)
        
        cars_data = [{"car_id": 1}, {"car_id": 2}]
        
        rentals_data = [
            {
                "car_id": 1,
                "rental_start_date": month_start.isoformat(),
                "rental_end_date": (now + timedelta(days=5)).isoformat()
            },
            {
                "car_id": 2,
                "rental_start_date": month_start.isoformat(),
                "rental_end_date": (now + timedelta(days=5)).isoformat()
            }
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = cars_data
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = rentals_data
        
        result = await calculate_current_month_utilization(company_id=1)
        
        assert result == 100.0


class TestCalculateMonthUtilization:
    """Tests for specific month utilization calculation"""
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_utilization_no_cars(self, mock_supabase):
        """Test month utilization with no cars"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        result = await calculate_month_utilization(company_id=1, month_date="2025-01-01")
        
        assert result == 0.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_utilization_full_month_rental(self, mock_supabase):
        """Test utilization with car rented for entire month"""
        # 1 car rented for all 31 days in January
        cars_data = [{"car_id": 1}]
        
        rentals_data = [
            {
                "car_id": 1,
                "rental_start_date": "2025-01-01T00:00:00+00:00",
                "rental_end_date": "2025-01-31T23:59:59+00:00"
            }
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = cars_data
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = rentals_data
        
        result = await calculate_month_utilization(company_id=1, month_date="2025-01-01")
        
        # 1 car * 31 days = 31 car-days rented out of 31 available = 100%
        assert result == 100.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_utilization_partial_month(self, mock_supabase):
        """Test utilization with car rented for half the month"""
        cars_data = [{"car_id": 1}]
        
        # Rented for 15 days (Jan 1-15)
        rentals_data = [
            {
                "car_id": 1,
                "rental_start_date": "2025-01-01T00:00:00+00:00",
                "rental_end_date": "2025-01-15T23:59:59+00:00"
            }
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = cars_data
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = rentals_data
        
        result = await calculate_month_utilization(company_id=1, month_date="2025-01-01")
        
        # 15 days rented out of 31 days
        assert result == pytest.approx(15 / 31 * 100)
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_utilization_multiple_cars(self, mock_supabase):
        """Test utilization with multiple cars and varying rental periods"""
        cars_data = [{"car_id": 1}, {"car_id": 2}]
        
        # Car 1: rented for 10 days, Car 2: rented for 20 days
        # Total: 30 car-days rented out of 62 car-days available (2 cars * 31 days)
        rentals_data = [
            {
                "car_id": 1,
                "rental_start_date": "2025-01-01T00:00:00+00:00",
                "rental_end_date": "2025-01-10T23:59:59+00:00"  # 10 days
            },
            {
                "car_id": 2,
                "rental_start_date": "2025-01-01T00:00:00+00:00",
                "rental_end_date": "2025-01-20T23:59:59+00:00"  # 20 days
            }
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = cars_data
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = rentals_data
        
        result = await calculate_month_utilization(company_id=1, month_date="2025-01-01")
        
        # 30 car-days / 62 car-days
        assert result == pytest.approx(30 / 62 * 100)


class TestCalculateMonthNetIncome:
    """Tests for monthly net income calculation"""
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_net_income_no_data(self, mock_supabase):
        """Test net income with no rentals or maintenance"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = []
        
        result = await calculate_month_net_income(company_id=1, month_date="2025-01-01")
        
        assert result == 0.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_net_income_revenue_only(self, mock_supabase):
        """Test net income with revenue but no maintenance"""
        # Mock rentals with revenue
        rentals_data = [
            {"amount_paid": 100.0},
            {"amount_paid": 150.0},
            {"amount_paid": 200.0}
        ]
        
        # Mock no maintenance
        maintenance_data = []
        
        # Setup mock to return different data for different table calls
        def mock_table_select(table_name):
            mock_chain = Mock()
            if table_name == "rentalrecords":
                mock_chain.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = rentals_data
            else:  # maintenancerecords
                mock_chain.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = maintenance_data
            return mock_chain
        
        mock_supabase.table.side_effect = mock_table_select
        
        result = await calculate_month_net_income(company_id=1, month_date="2025-01-01")
        
        # Total revenue: 100 + 150 + 200 = 450
        assert result == 450.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_net_income_with_maintenance(self, mock_supabase):
        """Test net income with both revenue and maintenance costs"""
        rentals_data = [
            {"amount_paid": 500.0},
            {"amount_paid": 300.0}
        ]
        
        maintenance_data = [
            {"maintenance_cost": 100.0},
            {"maintenance_cost": 50.0}
        ]
        
        def mock_table_select(table_name):
            mock_chain = Mock()
            if table_name == "rentalrecords":
                mock_chain.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = rentals_data
            else:
                mock_chain.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = maintenance_data
            return mock_chain
        
        mock_supabase.table.side_effect = mock_table_select
        
        result = await calculate_month_net_income(company_id=1, month_date="2025-01-01")
        
        # Revenue: 800, Maintenance: 150, Net: 650
        assert result == 650.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_net_income_negative(self, mock_supabase):
        """Test net income when maintenance exceeds revenue (negative)"""
        rentals_data = [{"amount_paid": 100.0}]
        maintenance_data = [{"maintenance_cost": 500.0}]
        
        def mock_table_select(table_name):
            mock_chain = Mock()
            if table_name == "rentalrecords":
                mock_chain.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = rentals_data
            else:
                mock_chain.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = maintenance_data
            return mock_chain
        
        mock_supabase.table.side_effect = mock_table_select
        
        result = await calculate_month_net_income(company_id=1, month_date="2025-01-01")
        
        # Revenue: 100, Maintenance: 500, Net: -400
        assert result == -400.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_net_income_handles_none_values(self, mock_supabase):
        """Test that None values in amount_paid are handled correctly"""
        rentals_data = [
            {"amount_paid": 100.0},
            {"amount_paid": None},  # Should be treated as 0
            {"amount_paid": 200.0}
        ]
        
        maintenance_data = []
        
        def mock_table_select(table_name):
            mock_chain = Mock()
            if table_name == "rentalrecords":
                mock_chain.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = rentals_data
            else:
                mock_chain.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = maintenance_data
            return mock_chain
        
        mock_supabase.table.side_effect = mock_table_select
        
        result = await calculate_month_net_income(company_id=1, month_date="2025-01-01")
        
        # Should sum to 300 (100 + 0 + 200)
        assert result == 300.0


class TestCalculateMonthMaintenanceCosts:
    """Tests for monthly maintenance costs calculation"""
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_maintenance_costs_no_records(self, mock_supabase):
        """Test maintenance costs with no records"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = []
        
        result = await calculate_month_maintenance_costs(company_id=1, month_date="2025-01-01")
        
        assert result == 0.0
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    async def test_calculate_month_maintenance_costs_multiple_records(self, mock_supabase):
        """Test maintenance costs with multiple records"""
        maintenance_data = [
            {"maintenance_cost": 100.0},
            {"maintenance_cost": 250.0},
            {"maintenance_cost": 75.5}
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = maintenance_data
        
        result = await calculate_month_maintenance_costs(company_id=1, month_date="2025-01-01")
        
        # Total: 100 + 250 + 75.5 = 425.5
        assert result == 425.5


class TestGetAnalyticsService:
    """Tests for dashboard analytics service"""
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    @patch('backend.services.analytics_service.encrypt_id')
    async def test_get_analytics_service_no_rentals(self, mock_encrypt, mock_supabase):
        """Test analytics with no rentals"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.error = None
        
        result = await get_analytics_service(company_id=1)
        
        assert result["totalRevenue"] == 0
        assert result["activeRentals"] == 0
        assert result["totalRentals"] == 0
        assert result["popularCars"] == []
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    @patch('backend.services.analytics_service.encrypt_id')
    async def test_get_analytics_service_calculates_revenue(self, mock_encrypt, mock_supabase):
        """Test that total revenue is calculated correctly"""
        rentals_data = [
            {"amount_paid": 100.0, "car_id": 1, "rental_end_date": "2025-12-31"},
            {"amount_paid": 200.0, "car_id": 1, "rental_end_date": "2025-12-31"},
            {"amount_paid": 150.0, "car_id": 2, "rental_end_date": "2025-12-31"}
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = rentals_data
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.error = None
        
        result = await get_analytics_service(company_id=1)
        
        assert result["totalRevenue"] == 450.0
        assert result["totalRentals"] == 3
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    @patch('backend.services.analytics_service.encrypt_id')
    async def test_get_analytics_service_counts_active_rentals(self, mock_encrypt, mock_supabase):
        """Test that active rentals are counted correctly"""
        future_date = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        past_date = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        
        rentals_data = [
            {"amount_paid": 100.0, "car_id": 1, "rental_end_date": future_date},  # Active
            {"amount_paid": 200.0, "car_id": 2, "rental_end_date": future_date},  # Active
            {"amount_paid": 150.0, "car_id": 3, "rental_end_date": past_date}     # Inactive
        ]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = rentals_data
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.error = None
        
        result = await get_analytics_service(company_id=1)
        
        assert result["activeRentals"] == 2
        assert result["totalRentals"] == 3
    
    @pytest.mark.asyncio
    @patch('backend.services.analytics_service.supabase')
    @patch('backend.services.analytics_service.encrypt_id')
    async def test_get_analytics_service_identifies_popular_cars(self, mock_encrypt, mock_supabase):
        """Test that popular cars are identified correctly"""
        mock_encrypt.return_value = "encrypted_id"
        
        # Car 1: 3 rentals, Car 2: 2 rentals, Car 3: 1 rental
        rentals_data = [
            {"amount_paid": 100.0, "car_id": 1, "rental_end_date": "2025-12-31"},
            {"amount_paid": 100.0, "car_id": 1, "rental_end_date": "2025-12-31"},
            {"amount_paid": 100.0, "car_id": 1, "rental_end_date": "2025-12-31"},
            {"amount_paid": 100.0, "car_id": 2, "rental_end_date": "2025-12-31"},
            {"amount_paid": 100.0, "car_id": 2, "rental_end_date": "2025-12-31"},
            {"amount_paid": 100.0, "car_id": 3, "rental_end_date": "2025-12-31"}
        ]
        
        car_data = {
            "car_id": 1,
            "make": "Toyota",
            "model": "Camry",
            "year": 2023,
            "license_plate": "ABC-123",
            "daily_rate": 50.0
        }
        
        # Mock rental query
        mock_rentals_result = Mock()
        mock_rentals_result.data = rentals_data
        mock_rentals_result.error = None
        
        # Mock car query
        mock_car_result = Mock()
        mock_car_result.data = car_data
        mock_car_result.error = None
        
        def mock_table_chain(table_name):
            if table_name == "rentalrecords":
                mock_chain = Mock()
                mock_chain.select.return_value.eq.return_value.execute.return_value = mock_rentals_result
                return mock_chain
            else:  # cars table
                mock_chain = Mock()
                mock_chain.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = mock_car_result
                return mock_chain
        
        mock_supabase.table.side_effect = mock_table_chain
        
        result = await get_analytics_service(company_id=1)
        
        # Should have popular cars
        assert len(result["popularCars"]) > 0
        # Most popular car should have count of 3
        assert result["popularCars"][0]["count"] == 3
