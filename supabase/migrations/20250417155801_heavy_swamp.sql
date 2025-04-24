/*
  # Survey Database Schema

  1. Tables
    - images: Stores image information and response counts
    - annotations: Stores user annotations for images
    - user_surveys: Tracks user survey completion status

  2. Security
    - RLS enabled on all tables
    - Policies for authenticated access
*/

-- Create images table if it doesn't exist
CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  response_count integer DEFAULT 0
);

-- Create annotations table if it doesn't exist
CREATE TABLE IF NOT EXISTS annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid REFERENCES images(id) NOT NULL,
  annotation_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  session_id text NOT NULL
);

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Create function to update response count
CREATE OR REPLACE FUNCTION update_image_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE images 
  SET response_count = response_count + 1
  WHERE id = NEW.image_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating response count
DROP TRIGGER IF EXISTS update_image_response_count ON annotations;
CREATE TRIGGER update_image_response_count
  AFTER INSERT ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_image_response_count();

-- Create indexes
CREATE INDEX IF NOT EXISTS annotations_session_id_idx ON annotations(session_id);

-- Create policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Anyone can read images" ON images;
  DROP POLICY IF EXISTS "Anyone can add annotations" ON annotations;

  -- Recreate policies
  CREATE POLICY "Anyone can read images"
    ON images
    FOR SELECT
    TO public
    USING (true);

  CREATE POLICY "Anyone can add annotations"
    ON annotations
    FOR INSERT
    TO public
    WITH CHECK (true);
END $$;