import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from 'next/link';
import { Spinner, Alert, Button, ListGroup, Offcanvas } from "react-bootstrap";

// Style cho nền Công nghệ/Cyberpunk (Đảm bảo full screen)
const techViewerStyle = {
    minHeight: '100vh',
    backgroundColor: '#1C0E30', 
    color: '#00F2F2', 
    fontFamily: 'monospace, sans-serif',
    position: 'relative', 
    padding: 0,
    margin: 0,
};

// Custom styles for OpenSeadragon container
const viewerContainerStyle = {
    width: "100%",
    height: "100vh", 
    border: "1px solid #FF00FF", 
    boxShadow: '0 0 10px rgba(255, 0, 255, 0.5)',
    position: "relative",
    backgroundColor: 'black' 
};

// Helper function to create marker overlay element
const createOverlayElement = (note) => {
    const container = document.createElement("div");
    container.id = `note-${note.id}`;
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "6px";
    container.style.zIndex = 100; 

    // marker (dot)
    const marker = document.createElement("div");
    marker.style.width = "16px";
    marker.style.height = "16px";
    marker.style.background = "#FF00FF"; // Marker hồng neon
    marker.style.borderRadius = "50%";
    marker.style.border = "2px solid #00F2F2"; // Viền xanh neon
    marker.style.boxShadow = "0 0 8px rgba(255,0,255,0.8)";
    marker.style.cursor = "pointer";

    // text label
    const label = document.createElement("div");
    label.id = `note-${note.id}-label`;
    label.className = "note-label";
    label.innerText = note.text || "";
    label.style.background = "rgba(0,0,0,0.8)";
    label.style.color = "#00F2F2"; 
    label.style.fontSize = "12px";
    label.style.padding = "2px 6px";
    label.style.borderRadius = "4px";
    label.style.maxWidth = "120px";
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    label.style.whiteSpace = "nowrap";

    container.appendChild(marker);
    container.appendChild(label);

    ["mousedown", "mouseup", "click"].forEach((ev) => {
        container.addEventListener(ev, (e) => e.stopPropagation());
    });
    
    return container;
};


const Viewer = () => {
    const router = useRouter();
    const { imageId } = router.query;
    const openseadragonContainerRef = useRef(null);
    const viewerInstanceRef = useRef(null);

    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notes, setNotes] = useState([]);
    const [showSidebar, setShowSidebar] = useState(false);

    // Helper to add overlay
    const addOverlay = (note, OpenSeadragon, viewer) => {
        const container = createOverlayElement(note);
        viewer.addOverlay({
            element: container,
            location: new OpenSeadragon.Point(note.x, note.y),
        });
    };

    // Fetch image
    useEffect(() => {
        async function fetchImage() {
            try {
                const response = await fetch("/api/images");
                if (!response.ok) throw new Error("Failed to retrieve system image data.");
                const data = await response.json();
                const foundImage = data.find((img) => img.id === imageId);
                if (foundImage) setImage(foundImage);
                else setError("Error: Target image file not found in directory.");
            } catch (err) {
                setError(err.message);
            }
        }
        if (imageId) fetchImage();
    }, [imageId]);

    // Init viewer
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            image &&
            openseadragonContainerRef.current &&
            viewerInstanceRef.current === null
        ) {
            import("openseadragon").then((OpenSeadragonModule) => {
                const OpenSeadragon = OpenSeadragonModule.default;
                const viewer = OpenSeadragon({
                    element: openseadragonContainerRef.current,
                    prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
                    tileSources: image.tileSource,
                    animationTime: 0.5,
                    blendTime: 0.1,
                    constrainDuringPan: true,
                    maxZoomPixelRatio: 2,
                    minZoomLevel: 1,
                    visibilityRatio: 1,
                    zoomPerScroll: 2,
                });
                viewerInstanceRef.current = viewer;

                // Only hide loading once viewer is ready
                viewer.addHandler("open", () => {
                    setTimeout(() => {
                        setLoading(false);
                    }, 2000); 
                });

                // Load notes from local storage
                const saved = localStorage.getItem(`notes_${imageId}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setNotes(parsed);
                    parsed.forEach((note) => {
                        addOverlay(note, OpenSeadragon, viewer);
                    });
                }

                // Click to add marker
                viewer.addHandler("canvas-click", function (event) {
                    if (!event.quick) return;

                    const viewportPoint = viewer.viewport.pointFromPixel(event.position);
                    const newNote = {
                        id: Date.now(),
                        x: viewportPoint.x,
                        y: viewportPoint.y,
                        text: ""
                    };

                    setNotes((prev) => {
                        const updated = [...prev, newNote];
                        localStorage.setItem(`notes_${imageId}`, JSON.stringify(updated));
                        return updated;
                    });

                    addOverlay(newNote, OpenSeadragon, viewer);
                });
            });
        }

        return () => {
            if (viewerInstanceRef.current) {
                viewerInstanceRef.current.destroy();
                viewerInstanceRef.current = null;
            }
        };
    }, [image]);


    // ----------------- UI render -----------------
    if (loading && !image) 
        return (
            <div className="text-center mt-5" style={techViewerStyle}>
                <Spinner animation="border" variant="info" role="status">
                    <span className="visually-hidden">Loading data stream...</span>
                </Spinner>
                <p className="mt-2" style={{color: '#00F2F2'}}>Loading data stream...</p>
            </div>
        );

    if (error)
        return (
            <div className="text-center mt-5" style={techViewerStyle}>
                <Alert variant="danger">
                    Error: {error} <Link href="/" className="text-danger">Return to Main Grid</Link>
                </Alert>
            </div>
        );

    return (
        <div style={techViewerStyle}>
            <Head>
                <title>Viewing: {image?.title || "Data File"}</title>
                <style>{`
                    body { overflow: hidden; } 
                    /* Customizing Bootstrap components for Cyberpunk theme */
                    .offcanvas-header { background: #2A1A40; border-bottom: 1px solid #FF00FF; color: #FF00FF; }
                    .offcanvas-body { background: #1C0E30; color: #00F2F2; }
                    .offcanvas-title { color: #FF00FF; }
                    .btn-close { filter: invert(1) hue-rotate(180deg); }
                    .list-group-item { background: #2A1A40; border-color: #3A3A60; color: #00F2F2; }
                    .form-control { background: #1C0E30; border-color: #00F2F2; color: #FF00FF; }
                `}</style>
            </Head>

            {/* Full-screen Loading Overlay */}
            {loading && image && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background: "rgba(0,0,0,0.9)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 2000,
                        color: "#00F2F2",
                        fontFamily: "monospace, sans-serif",
                    }}
                >
                    <Spinner animation="grow" variant="danger" role="status" style={{ width: '3rem', height: '3rem' }} />
                    <h2 style={{ marginTop: "20px", letterSpacing: "2px", color: '#FF00FF' }}>
                        INITIALIZING DISPLAY MATRIX...
                    </h2>
                    <p style={{ opacity: 0.8, color: '#00F2F2' }}>OpenSeadragon Engine v2.4 running.</p>
                </div>
            )}


            {/* Container Viewer */}
            <div
                ref={openseadragonContainerRef}
                className="viewer"
                style={viewerContainerStyle}
            >
                {/* Floating controls (Top Right) */}
                <div
                    style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        zIndex: 1000,
                    }}
                >
                    <Button
                        size="sm"
                        variant="info"
                        onClick={() => setShowSidebar(true)}
                    >
                        📑 ACCESS LOGS
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                            const viewer = viewerInstanceRef.current;
                            if (viewer) {
                                // Xóa toàn bộ overlay khỏi viewer
                                notes.forEach((note) => {
                                    const el = document.querySelector(`#note-${note.id}`);
                                    if (el) viewer.removeOverlay(el);
                                });
                            }
                            // Xóa dữ liệu khỏi state và localStorage
                            setNotes([]);
                            localStorage.removeItem(`notes_${imageId}`);
                        }}
                    >
                        🗑 ERASE ALL LOGS
                    </Button>
                </div>
            </div>

            {/* Back Button (Bottom Left) - FIX: Use Link/Button */}
            <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 1000 }}>
                <Link href="/" passHref legacyBehavior>
                    <Button variant="outline-danger" className="shadow-lg" style={{ color: '#FF00FF', borderColor: '#FF00FF' }}>
                        &larr; EXIT GRID (MAIN HUB)
                    </Button>
                </Link>
            </div>


            {/* Sidebar (Offcanvas) - Danh sách marker */}
            <Offcanvas
                show={showSidebar}
                onHide={() => setShowSidebar(false)}
                placement="end"
            >
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>📑 LOGGED ANOMALIES</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    {notes.length === 0 ? (
                        <p style={{ color: '#00F2F2' }}>No anomalies logged yet. Click the image to tag a point.</p>
                    ) : (
                        <ListGroup>
                            {notes.map((note, idx) => (
                                <ListGroup.Item key={note.id}>
                                    <span style={{color: '#FF00FF'}}>🔴 Anomaly #{idx + 1}</span>
                                    <input
                                        type="text"
                                        className="form-control mt-2"
                                        placeholder="Enter system note..."
                                        value={note.text || ""}
                                        onChange={(e) => {
                                            const newText = e.target.value;
                                            setNotes((prev) => {
                                                const updated = prev.map((n) =>
                                                    n.id === note.id ? { ...n, text: newText } : n
                                                );
                                                localStorage.setItem(`notes_${imageId}`, JSON.stringify(updated));

                                                // Update label next to marker
                                                const el = document.querySelector(`#note-${note.id}-label`);
                                                if (el) el.innerText = newText;

                                                return updated;
                                            });
                                        }}
                                    />

                                    <div className="mt-2 d-flex justify-content-between">
                                        <Button
                                            size="sm"
                                            variant="outline-info"
                                            onClick={() => {
                                                const viewer = viewerInstanceRef.current;
                                                if (viewer) {
                                                    viewer.viewport.panTo({ x: note.x, y: note.y });
                                                    viewer.viewport.zoomTo(2.5);
                                                    setShowSidebar(false);
                                                }
                                            }}
                                        >
                                            👁 LOCATE
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={() => {
                                                const viewer = viewerInstanceRef.current;
                                                const markerContainer = document.querySelector(`#note-${note.id}`);
                                                if (viewer && markerContainer) {
                                                    viewer.removeOverlay(markerContainer);
                                                }

                                                setNotes((prev) => {
                                                    const updated = prev.filter((n) => n.id !== note.id);
                                                    localStorage.setItem(
                                                        `notes_${imageId}`,
                                                        JSON.stringify(updated)
                                                    );
                                                    return updated;
                                                });
                                            }}
                                        >
                                            ❌ DELETE LOG
                                        </Button>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>

                    )}
                </Offcanvas.Body>
            </Offcanvas>
        </div>
    );

};

export default Viewer;