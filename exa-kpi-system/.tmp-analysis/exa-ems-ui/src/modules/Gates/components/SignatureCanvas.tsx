import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { CButton, CCol, CRow } from "@coreui/react-pro";
import CIcon from "@coreui/icons-react";
import { cilReload } from "@coreui/icons";

// -----------------------------
// Types
// -----------------------------
type GateShape = {
  signatureDriver?: string | null;
  signatureInspector?: string | null;
  [key: string]: any;
};

type Props = {
  signatureDriver?: string | null;
  signatureInspector?: string | null;
  isEdit: boolean;
  getSignatureSrc: (sig: string) => string;
  setGate: React.Dispatch<React.SetStateAction<GateShape>>;
  setSignatureDriver?: (dataUrl: string | null) => void;
  setSignatureInspector?: (dataUrl: string | null) => void;
};

const trimSignatureCanvas = (source: HTMLCanvasElement) => {
  const ctx = source.getContext("2d");
  if (!ctx) return source;

  const { width, height } = source;
  if (width <= 0 || height <= 0) return source;

  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;

  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;
  let found = false;

  // Find bounds of any non-transparent pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3]; // alpha
      if (a > 0) {
        found = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  // If empty canvas, return original
  if (!found) return source;

  const trimmedW = right - left + 1;
  const trimmedH = bottom - top + 1;

  if (trimmedW <= 0 || trimmedH <= 0) return source;

  const out = document.createElement("canvas");
  out.width = trimmedW;
  out.height = trimmedH;

  const outCtx = out.getContext("2d");
  if (!outCtx) return source;

  outCtx.drawImage(source, left, top, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
  return out;
};

// -----------------------------
// Hook: auto size canvas to wrapper width and maintain DPR correctness
// -----------------------------
function useAutoCanvasSize(
  wrapRef: React.RefObject<HTMLDivElement>,
  padRef: React.RefObject<SignatureCanvas>,
  height = 200
) {
  const [width, setWidth] = useState(500);

  // measure container width
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const next = Math.max(280, Math.floor(el.clientWidth));
      setWidth(next);
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();

    return () => ro.disconnect();
  }, [wrapRef]);

  // apply DPR-correct resize WITHOUT breaking pointer mapping
  useLayoutEffect(() => {
    const pad = padRef.current;
    if (!pad) return;

    // Save current strokes before resizing (so resize doesn't wipe the signature)
    const data = pad.toData();

    const canvas = pad.getCanvas();
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    // 1) CSS size (visual size)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.display = "block";
    canvas.style.touchAction = "none"; // important for pointer/touch accuracy

    // 2) internal bitmap size
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    // 3) reset transform so drawing coords map to CSS pixels
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 4) re-sync by clearing & restoring
    pad.clear();
    if (data?.length) pad.fromData(data);
  }, [width, height, padRef]);

  return { width, height };
}

// -----------------------------
// Component
// -----------------------------
export default function SignaturesSection({
  signatureDriver,
  signatureInspector,
  isEdit,
  getSignatureSrc,
  setGate,
  setSignatureDriver,
  setSignatureInspector,
}: Props) {
  const sigPadDriver = useRef<SignatureCanvas>(null);
  const sigPadInspector = useRef<SignatureCanvas>(null);

  const wrapDriverRef = useRef<HTMLDivElement>(null);
  const wrapInspectorRef = useRef<HTMLDivElement>(null);

  useAutoCanvasSize(wrapDriverRef, sigPadDriver, 200);
  useAutoCanvasSize(wrapInspectorRef, sigPadInspector, 200);

  // Update BOTH optional local props + gate
  const setDriverSig = useCallback(
    (dataUrl: string | null) => {
      setSignatureDriver?.(dataUrl);
      setGate((prev) => ({ ...prev, signatureDriver: dataUrl }));
    },
    [setGate, setSignatureDriver]
  );

  const setInspectorSig = useCallback(
    (dataUrl: string | null) => {
      setSignatureInspector?.(dataUrl);
      setGate((prev) => ({ ...prev, signatureInspector: dataUrl }));
    },
    [setGate, setSignatureInspector]
  );

  // Trim on end (no getTrimmedCanvas usage -> avoids your error)
  const trimDriver = useCallback(() => {
    const pad = sigPadDriver.current;
    if (!pad) return;

    if (pad.isEmpty()) {
      setDriverSig(null);
      return;
    }

    const canvas = pad.getCanvas();
    const trimmed = trimSignatureCanvas(canvas);
    setDriverSig(trimmed.toDataURL("image/png"));
  }, [setDriverSig]);

  const trimInspector = useCallback(() => {
    const pad = sigPadInspector.current;
    if (!pad) return;

    if (pad.isEmpty()) {
      setInspectorSig(null);
      return;
    }

    const canvas = pad.getCanvas();
    const trimmed = trimSignatureCanvas(canvas);
    setInspectorSig(trimmed.toDataURL("image/png"));
  }, [setInspectorSig]);

  const hardClear = useCallback((pad: SignatureCanvas | null) => {
    if (!pad) return;

    // clear signature_pad internal state
    pad.clear();

    // clear actual bitmap (important after DPR resizes)
    const canvas = pad.getCanvas();
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }, []);

  const clearDriver = useCallback(() => {
    hardClear(sigPadDriver.current);
    setDriverSig(null);
  }, [hardClear, setDriverSig]);

  const clearInspector = useCallback(() => {
    hardClear(sigPadInspector.current);
    setInspectorSig(null);
  }, [hardClear, setInspectorSig]);

  const isReadOnlyDriver = Boolean(signatureDriver) && isEdit;
  const isReadOnlyInspector = Boolean(signatureInspector) && isEdit;

  return (
    <CRow className="g-3">
      {/* Driver */}
      <CCol xs={12} md={6}>
        <div className="p-3 rounded border" style={{ backgroundColor: 'var(--cui-body-bg)', color: 'var(--cui-body-color)' }}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <strong>Driver Signature</strong>
            {!isReadOnlyDriver && (
              <CButton color="warning" size="sm" onClick={clearDriver}>
                <CIcon icon={cilReload} />
              </CButton>
            )}
          </div>

          <div ref={wrapDriverRef} style={{ width: "100%", overflow: "hidden", borderRadius: 4, backgroundColor: '#fff' }}>
            {isReadOnlyDriver ? (
              <img
                src={getSignatureSrc(signatureDriver as string)}
                alt="Driver's Signature"
                style={{ width: "100%", height: 200, objectFit: "contain", backgroundColor: '#fff' }}
              />
            ) : (
              <SignatureCanvas
                ref={sigPadDriver}
                onEnd={trimDriver}
                penColor="black"
                backgroundColor="white"
                canvasProps={{
                  className: "signCanvas",
                  style: {
                    width: "100%",
                    height: 200,
                    display: "block",
                    touchAction: "none",
                    backgroundColor: '#fff',
                  },
                }}
              />
            )}
          </div>
        </div>
      </CCol>

      {/* Inspector */}
      <CCol xs={12} md={6}>
        <div className="p-3 rounded border" style={{ backgroundColor: 'var(--cui-body-bg)', color: 'var(--cui-body-color)' }}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <strong>Inspector Signature</strong>
            {!isReadOnlyInspector && (
              <CButton color="warning" size="sm" onClick={clearInspector}>
                <CIcon icon={cilReload} />
              </CButton>
            )}
          </div>

          <div ref={wrapInspectorRef} style={{ width: "100%", overflow: "hidden", borderRadius: 4, backgroundColor: '#fff' }}>
            {isReadOnlyInspector ? (
              <img
                src={getSignatureSrc(signatureInspector as string)}
                alt="Inspector's Signature"
                style={{ width: "100%", height: 200, objectFit: "contain", backgroundColor: '#fff' }}
              />
            ) : (
              <SignatureCanvas
                ref={sigPadInspector}
                onEnd={trimInspector}
                penColor="black"
                backgroundColor="white"
                canvasProps={{
                  className: "signCanvas",
                  style: {
                    width: "100%",
                    height: 200,
                    display: "block",
                    touchAction: "none",
                    backgroundColor: '#fff',
                  },
                }}
              />
            )}
          </div>
        </div>
      </CCol>
    </CRow>
  );
}
