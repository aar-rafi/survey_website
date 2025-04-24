/*
  # Add identity fields to annotations table

  1. Changes
    - Add form_token column for preventing duplicate submissions
    - Add user_agent column for tracking browser information
    - Add unique constraint on form_token

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE annotations
ADD COLUMN IF NOT EXISTS form_token uuid,
ADD COLUMN IF NOT EXISTS user_agent text;

-- Add unique constraint to prevent duplicate submissions
ALTER TABLE annotations
ADD CONSTRAINT unique_form_token UNIQUE (form_token);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_annotations_form_token ON annotations(form_token);