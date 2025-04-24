/*
  # Update annotations table for PNG storage

  1. Changes
    - Modify `annotation_data` column to store image URLs instead of JSON data
    - Rename column to `annotated_image_url` to better reflect its purpose
    - Change type from `jsonb` to `text`

  2. Security
    - Maintain existing RLS policies
*/

DO $$ BEGIN
  -- Rename and change type of annotation_data column
  ALTER TABLE annotations 
    RENAME COLUMN annotation_data TO annotated_image_url;
    
  ALTER TABLE annotations 
    ALTER COLUMN annotated_image_url TYPE text;

  -- Add NOT NULL constraint
  ALTER TABLE annotations 
    ALTER COLUMN annotated_image_url SET NOT NULL;

END $$;