import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Container, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { io } from "socket.io-client";
const socket = io({ path: "/api/socket" });

// Sau khi upload thành công:

// Style for the dark space background
const spaceStyle = {
  minHeight: '100vh',
  backgroundColor: '#0A192F', // Deep blue-black color
  color: '#E0E7FF', // Light text color
  paddingBottom: '50px',
  position: 'relative',
};

// Style for the Form Box
const formBoxStyle = {
  padding: '30px',
  borderRadius: '8px',
  backgroundColor: '#1E293B',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
  maxWidth: '600px',
  margin: '0 auto',
};

export default function UploadPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    if (!imageFile || !title) {
      setError('⚠️ Object Name and Data File are required to begin transmission.');
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('title', title);
    formData.append('description', description);

    try {
      // Simulate progress bar increase for the actual upload phase
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 500);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval); // Stop simulated upload progress

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error Transmitting Data to Satellite!');
      }

      const data = await response.json();
      socket.emit("new-image", data);

      setMessage('✅ Transmission Successful! Data is being processed... Redirecting to Base Station.');

      // Final progress for processing phase
      setUploadProgress(100);

      setTimeout(() => {
        router.push('/'); // Redirect to gallery after successful upload
      }, 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(`❌ Transmission Error: ${err.message || 'Connection error with the control station.'}`);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={spaceStyle}>
      <Container className="pt-5">
        <Head>
          <title>Transmit Astronomical Data - AstroViewer</title>
        </Head>

        {/* Back Button in the Top Left Corner */}
        <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
          <Link href="/" passHref legacyBehavior>
            <Button variant="outline-info" className="shadow-sm">
              &larr; Back to Base Station
            </Button>
          </Link>
        </div>

        <h1 className="text-center mb-4 text-warning">📡 Transmit Astronomical Data to the Network</h1>
        <p className="text-center mb-4 text-light">Transmit your astronomical images (Nebulae, Galaxies, Planets...) to expand the Cosmic map.</p>

        <div style={formBoxStyle}>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formTitle" className="mb-3">
              <Form.Label className="text-info">Object Name (Title)</Form.Label>
              <Form.Control
                type="text"
                placeholder="E.g.: Orion Nebula, Andromeda Galaxy..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isUploading}
                className="bg-dark text-white border-primary"
              />
            </Form.Group>

            <Form.Group controlId="formDescription" className="mb-3">
              <Form.Label className="text-info">Observation Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Notes on equipment, location, or scientific information."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
                className="bg-dark text-white border-primary"
              />
            </Form.Group>

            <Form.Group controlId="formFile" className="mb-4">
              <Form.Label className="text-info">Image Data File</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                required
                disabled={isUploading}
                className="bg-dark text-white border-primary"
              />
            </Form.Group>

            {isUploading && (
              <>
                <p className="text-center text-warning">Transmitting data...</p>
                <ProgressBar
                  now={uploadProgress}
                  label={`${uploadProgress}%`}
                  variant="warning"
                  className="mb-3"
                />
              </>
            )}

            {message && <Alert variant="success" className="mb-3">{message}</Alert>}
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

            <Button
              variant="primary"
              type="submit"
              disabled={isUploading}
              className="w-100 btn-lg shadow-sm"
            >
              {isUploading ? '🛰️ Transmitting...' : '🚀 Start Transmission'}
            </Button>
          </Form>
        </div>
      </Container>
    </div>
  );
}