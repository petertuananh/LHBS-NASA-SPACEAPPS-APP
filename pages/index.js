import Head from 'next/head';
import Link from 'next/link';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap'; // Added Spinner, Alert
import { useState, useEffect } from 'react'; // Added useState, useEffect

export default function Home() {
  const [spaceImages, setSpaceImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/images');
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }
        const data = await response.json();
        setSpaceImages(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchImages();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading images...</span>
        </Spinner>
        <p className="mt-2">Loading images...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">Error: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Head>
        <title>Cosmic Lens - Image Gallery</title>
        <meta name="description" content="Explore massive space images" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 className="text-center mb-4">Cosmic Lens</h1>
        <p className="text-center text-muted mb-3">Expand your vision! Select an image to begin exploring.</p>
        <div className="text-center mb-5">
          <Link href="/upload" passHref legacyBehavior>
            <a className="btn btn-success">Upload New Image</a>
          </Link>
        </div>

        <Row>
          {spaceImages.length === 0 ? (
            <Col className="text-center">
              <p>No images uploaded yet. Be the first to explore!</p>
            </Col>
          ) : (
            spaceImages.map((image) => (
              <Col md={6} key={image.id} className="mb-4">
                <Card bg="dark" text="white">
                  <Card.Body>
                    <Card.Title>{image.title}</Card.Title>
                    <Card.Text>{image.description}</Card.Text>
                    <Link href={`/viewer/${image.id}`} passHref legacyBehavior>
                      <a className="btn btn-primary">Explore</a>
                    </Link>
                  </Card.Body>
                </Card>
              </Col>
            ))
          )}
        </Row>
      </main>
    </Container>
  );
}

