-- Add BUSINESS_EVENTS to the DashboardWidgetViews enum so business-outcome
-- widgets can be persisted alongside traces/observations/scores widgets.
ALTER TYPE "DashboardWidgetViews" ADD VALUE IF NOT EXISTS 'BUSINESS_EVENTS';
