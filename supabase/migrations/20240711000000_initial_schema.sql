-- Initial Schema for ABC Costing App

-- Create companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create periods table
CREATE TABLE periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'January 2024'
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;

-- Create resources table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Create activities table
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create cost_objects table (Products/Services)
CREATE TABLE cost_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE cost_objects ENABLE ROW LEVEL SECURITY;

-- Create resource_drivers table
CREATE TABLE resource_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT, -- e.g., 'm2', 'hours'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE resource_drivers ENABLE ROW LEVEL SECURITY;

-- Create activity_drivers table
CREATE TABLE activity_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT, -- e.g., 'number of orders'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE activity_drivers ENABLE ROW LEVEL SECURITY;

-- Create resource_distributions table (mapping resource -> activities)
CREATE TABLE resource_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES resource_drivers(id),
    driver_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5, 4), -- optional if calculated
    assigned_cost DECIMAL(12, 2), -- the result of the calculation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE resource_distributions ENABLE ROW LEVEL SECURITY;

-- Create activity_distributions table (mapping activity -> cost objects)
CREATE TABLE activity_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    cost_object_id UUID REFERENCES cost_objects(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES activity_drivers(id),
    driver_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5, 4),
    assigned_cost DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE activity_distributions ENABLE ROW LEVEL SECURITY;

-- Create a basic calculation RPC function
CREATE OR REPLACE FUNCTION calculate_abc_period(p_period_id UUID)
RETURNS void AS $$
DECLARE
    -- variables
BEGIN
    -- This is a placeholder for the actual calculation logic
    -- In a real app, this would iterate over resources, sum their driver quantities,
    -- calculate percentages, assign costs to activities, then repeat for activities to cost objects.
    RAISE NOTICE 'Calculating ABC for period %', p_period_id;
END;
$$ LANGUAGE plpgsql;
