import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Container, Form, Button, Alert, ProgressBar } from 'react-bootstrap';

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
      setError('Please select an image and provide a title.');
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('title', title);
    formData.append('description', description);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // No 'Content-Type' header needed for FormData, browser sets it automatically
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      setMessage(data.message + ' Redirecting...');
      // Simulate progress for processing phase
      setUploadProgress(100);
      setTimeout(() => {
        router.push('/'); // Redirect to gallery after successful upload
      }, 2000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Head>
        <title>Upload New Image</title>
      </Head>
      <h1 className="text-center mb-4">Upload New Space Image</h1>

      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="formTitle" className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter image title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isUploading}
          />
        </Form.Group>

        <Form.Group controlId="formDescription" className="mb-3">
          <Form.Label>Description (Optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Enter image description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isUploading}
          />
        </Form.Group>

        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Image File</Form.Label>
          <Form.Control
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            required
            disabled={isUploading}
          />
        </Form.Group>

        {isUploading && <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} className="mb-3" />}

        {message && <Alert variant="success" className="mb-3">{message}</Alert>}
        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

        <Button variant="primary" type="submit" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </Button>
      </Form>
    </Container>
  );
}
