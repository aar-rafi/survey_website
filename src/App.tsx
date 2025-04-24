import React, { useEffect, useState } from 'react';
import { ImageAnnotator } from './components/ImageAnnotator';
import { AdminPanel } from './components/AdminPanel';
import { LoginForm } from './components/LoginForm';
import { supabase } from './lib/supabase';
import { getOrCreateIdentity, getOrCreateFormToken } from './lib/identity';
import { getCurrentUser, signOut } from './lib/auth';
import type { Database } from './lib/database.types';

type Image = Database['public']['Tables']['images']['Row'];

function App() {
  const [sessionId] = useState(() => getOrCreateIdentity());
  const [formToken] = useState(() => getOrCreateFormToken());
  const [images, setImages] = useState<Image[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchImages();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('response_count', { ascending: true })
        .limit(5);

      if (error) throw error;
      setImages(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching images:', error);
      setLoading(false);
    }
  };

  const handleSaveAnnotation = async (publicURL: string) => {
    if (!images[currentImageIndex]) return;

    try {
      // First, check if this form token has been used
      const { data: existingSubmission } = await supabase
        .from('annotations')
        .select('id')
        .eq('form_token', formToken)
        .single();

      if (existingSubmission) {
        alert('This submission has already been recorded.');
        return;
      }

      const { error } = await supabase
        .from('annotations')
        .insert([{
          image_id: images[currentImageIndex].id,
          annotated_image_url: publicURL,
          session_id: sessionId,
          form_token: formToken,
          user_agent: navigator.userAgent,
        }]);

      if (error) throw error;

      if (currentImageIndex < images.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
      } else {
        // Survey completed
        alert('Thank you for completing the survey!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
      alert('Failed to save annotation. Please try again.');
    }
  };

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (isAdmin) {
    if (!isAuthenticated) {
      return <LoginForm onSuccess={() => setIsAuthenticated(true)} />;
    }
    return <AdminPanel onBack={() => setIsAdmin(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-4">Drawing Instructions</h2>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <span className="bg-gray-100 rounded-lg px-3 py-1 mr-3 font-mono text-sm">Shift + Drag</span>
                <span>Hold Shift and drag the mouse to draw straight lines</span>
              </li>
            </ul>
            <button
              onClick={() => setShowInstructions(false)}
              className="w-full bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4 gap-2">
          {isAuthenticated && (
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          )}
          <button
            onClick={() => setIsAdmin(true)}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Admin Panel
          </button>
        </div>

        {images.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-xl">No images available for annotation.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Image Annotation Survey</h1>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${((currentImageIndex + 1) / images.length) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Image {currentImageIndex + 1} of {images.length}
              </p>
            </div>
            
            <ImageAnnotator
              imageUrl={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/survey_images/${images[currentImageIndex].file_path}`}
              onSave={handleSaveAnnotation}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App