import Head from 'next/head';
import Link from 'next/link';
import { Container, Row, Col, Card, Spinner, Alert, Toast, ToastContainer, Form, Button, Modal } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import { io } from "socket.io-client";

const spaceStyle = {
  minHeight: '100vh',
  backgroundColor: '#0A192F',
  color: '#E0E7FF',
  paddingBottom: '50px',
};

const heroStyle = {
  padding: '60px 0',
  textAlign: 'center',
  background: 'linear-gradient(180deg, rgba(10,25,47,1) 0%, rgba(20,40,70,1) 100%)',
  marginBottom: '30px',
  borderRadius: '8px',
};

export default function Home() {
  const [spaceImages, setSpaceImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Consent state
  const [displayName, setDisplayName] = useState('');
  const [showConsent, setShowConsent] = useState(false);

  // === LOAD CONSENT ===
  useEffect(() => {
    const name = localStorage.getItem("astro_displayName");
    const consent = localStorage.getItem("astro_consent");

    if (name && consent === "true") {
      // 🔥 Đã lưu trước đó → dùng luôn
      setDisplayName(name);
      setShowConsent(false);
    } else {
      // ❗ Chưa có → yêu cầu người dùng nhập
      setShowConsent(true);
    }
  }, []);

  // === HANDLE CONSENT SAVE ===
  const handleConsentAccept = () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      alert("Please enter your display name to continue.");
      return;
    }

    // Lưu vào localStorage
    localStorage.setItem("astro_displayName", trimmedName);
    localStorage.setItem("astro_consent", "true");

    // Cập nhật state
    setDisplayName(trimmedName);
    setShowConsent(false);

    // Thông báo
    pushNotification(`🚀 Welcome aboard, ${trimmedName}!`);
  };

  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!socket) return;
    socket.on("user:list", (users) => setOnlineUsers(users));
  }, [socket]);



  // === SOCKET.IO SETUP ===
  useEffect(() => {
    if (showConsent || !displayName) return; // Chỉ kết nối sau khi có tên hợp lệ

    const socket = io(window.location.origin, {
      path: "/api/socket_io",
      query: { name: displayName },
      transports: ["websocket"]
    });

    setSocket(socket);

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id, "as", displayName);
    });

    socket.on("user:join", (user) => {
      console.log(user)
      pushNotification(`🪐 Explorer joined: ${user.name || user.id}`);
    });

    socket.on("user:leave", (user) => {
      pushNotification(`👋 Explorer left: ${user.name || user.id}`);
    });

    socket.on("image:added", (image) => {
      setSpaceImages((prev) => [image, ...prev]);
      pushNotification(`🌌 New image: ${image.title}`);
    });

    return () => socket.disconnect();
  }, [showConsent, displayName]);




  // === TOAST NOTIFICATION ===
  const pushNotification = (msg) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // === FETCH IMAGE LIST ===
  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/images');
        if (!response.ok) {
          throw new Error('Failed to retrieve data from the observation post.');
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
  }, []);

  if (loading) {
    return (
      <div style={spaceStyle}>
        <Container className="pt-5 text-center">
          <Spinner animation="grow" variant="primary" role="status">
            <span className="visually-hidden">Scanning the cosmos...</span>
          </Spinner>
          <p className="mt-3 text-white">Scanning the cosmos for data...</p>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div style={spaceStyle}>
        <Container className="pt-5">
          <Alert variant="danger">Error: Failed to establish contact with the station. {error}</Alert>
        </Container>
      </div>
    );
  }

  return (
    <div style={spaceStyle}>
      <Head>
        <title>AstroViewer - The Cosmic Gateway</title>
        <meta name="description" content="Explore stunning astronomical images of nebulae, galaxies, and planets." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* === Toast Notification === */}
      <ToastContainer className="p-3" position="top-end" style={{ zIndex: 1055 }}>
        {notifications.map(n => (
          <Toast key={n.id} bg="info" autohide delay={5000} show={true}>
            <Toast.Header closeButton={false}>
              <strong className="me-auto">🚀 Notification</strong>
              <small>just now</small>
            </Toast.Header>
            <Toast.Body className="text-dark">{n.msg}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      {/* === Consent Modal === */}
      <Modal show={showConsent} backdrop="static" centered>
        <Modal.Header>
          <p className="text-info">
            👩‍🚀 Active Explorers: {onlineUsers.join(", ")}
          </p>

          <Modal.Title>🪐 Welcome to AstroViewer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-secondary">
            Before you begin your interstellar exploration, please provide a display name and accept our terms of service.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Display Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your name (e.g. StarWanderer)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Form.Group>
          <Form.Check
            type="checkbox"
            id="accept-terms"
            label="I agree to the mission guidelines and data sharing policy."
            onChange={(e) => localStorage.setItem("astro_consent", e.target.checked ? "true" : "false")}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled>Decline</Button>
          <Button variant="primary" onClick={handleConsentAccept}>Accept & Continue</Button>
        </Modal.Footer>
      </Modal>

      {/* === Main Content === */}
      {!showConsent && (
        <Container className="pt-4">
          <header style={heroStyle}>
            <h1 className="display-4 text-white mb-3">🌌 AstroViewer: The Cosmic Gateway</h1>
            <p className="lead text-info mb-4">
              Welcome {displayName || 'Explorer'}, begin your interstellar journey today!
            </p>
            <div className="text-center">
              <Link href="/upload" passHref legacyBehavior>
                <a className="btn btn-warning btn-lg shadow-sm">🛰️ Transmit New Data (Upload Image)</a>
              </Link>
            </div>
          </header>

          <main>
            <h2 className="text-center mb-5 text-light">Galactic Data Archives</h2>
            <Row>
              {spaceImages.length === 0 ? (
                <Col className="text-center">
                  <p className="text-muted">No data transmitted yet. Be the first to explore! 🚀</p>
                </Col>
              ) : (
                spaceImages.map((image) => (
                  <Col md={6} lg={4} key={image.id} className="mb-4">
                    <Card bg="dark" text="white" className="border border-primary h-100 shadow-lg">
                      <Card.Body>
                        <Card.Title className="text-warning">{image.title}</Card.Title>
                        <Card.Text className="text-light mt-2">
                          {image.description || 'Information about this celestial object is waiting to be explored.'}
                        </Card.Text>
                        <Link href={`/viewer/${image.id}`} passHref legacyBehavior>
                          <a className="btn btn-outline-info mt-3">🔭 Explore Details</a>
                        </Link>
                      </Card.Body>
                    </Card>
                  </Col>
                ))
              )}
            </Row>
          </main>
        </Container>
      )}
    </div>
  );
}
