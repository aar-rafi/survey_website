import React, { useEffect, useState } from 'react';
import { ArrowLeft, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Image = Database['public']['Tables']['images']['Row'];

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching images:', error);
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of files) {
        // Upload to storage
        const filePath = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('survey_images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create database record
        const { error: dbError } = await supabase
          .from('images')
          .insert({
            file_path: filePath,
            file_name: file.name,
          });

        if (dbError) throw dbError;
      }

      fetchImages();
      alert('Images uploaded successfully!');
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image: Image) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('survey_images')
        .remove([image.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', image.id);

      if (dbError) throw dbError;

      setImages(images.filter(img => img.id !== image.id));
      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Survey
          </button>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-8">
            <label className="block mb-4">
              <div className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            </label>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p>Loading images...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group bg-white rounded-lg shadow overflow-hidden"
                >
                  <div className="aspect-w-16 aspect-h-9">
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/survey_images/${image.file_path}`}
                      alt={image.file_name}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/300x200?text=Error+Loading+Image';
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 truncate">{image.file_name}</p>
                    <p className="text-xs text-gray-500">Responses: {image.response_count}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(image)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {images.length === 0 && (
                <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No images uploaded yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}