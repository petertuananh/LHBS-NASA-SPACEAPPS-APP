import { useEffect, useRef, useState } from 'react'; // Added useState
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Spinner, Alert } from 'react-bootstrap'; // Added Spinner, Alert

const Viewer = () => {
  const router = useRouter();
  const { imageId } = router.query;
  const openseadragonContainerRef = useRef(null); // Ref for the OSD container div
  const viewerInstanceRef = useRef(null); // Ref to store the OSD instance

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchImage() {
      try {
        const response = await fetch('/api/images');
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }
        const data = await response.json();
        const foundImage = data.find(img => img.id === imageId);
        if (foundImage) {
          setImage(foundImage);
        } else {
          setError('Image not found.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchImage();
  }, [imageId]); // Dependency array includes imageId

  useEffect(() => {
    // Only run this effect on the client-side, if image data is loaded,
    // and if the container ref is available and OSD not yet initialized
    if (typeof window !== 'undefined' && image && openseadragonContainerRef.current && viewerInstanceRef.current === null) {
      // Dynamically import OpenSeadragon here, inside the client-side check
      import('openseadragon').then((OpenSeadragonModule) => {
        // Ensure the component is still mounted and OSD not yet initialized
        if (openseadragonContainerRef.current && viewerInstanceRef.current === null) {
          const viewer = OpenSeadragonModule.default({
            element: openseadragonContainerRef.current, // Pass the ref directly
            prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
            tileSources: image.tileSource,
            animationTime: 0.5,
            blendTime: 0.1,
            constrainDuringPan: true,
            maxZoomPixelRatio: 2,
            minZoomLevel: 1,
            visibilityRatio: 1,
            zoomPerScroll: 2
          });
          viewerInstanceRef.current = viewer; // Store the instance
        }
      });
    }

    return () => {
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.destroy();
        viewerInstanceRef.current = null; // Clear the ref
      }
    };
  }, [image]); // Dependency array only needs image

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading image...</span>
        </Spinner>
        <p className="mt-2">Loading image...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-5">
        <Alert variant="danger">Error: {error} <a href="/">Back to gallery</a></Alert>
      </div>
    );
  }

  if (!image) {
    return <div className="text-center mt-5">Image not found. <a href="/">Back to gallery</a></div>;
  }

  return (
    <div>
        <Head>
            <title>Viewing: {image.title}</title>
        </Head>
        <div ref={openseadragonContainerRef} className="viewer"></div>
    </div>
  );
};

export default Viewer;
