import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Camera,
  X,
  Upload,
  RefreshCw,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertTriangle,
  ScanLine,
  UserCheck,
  FileText,
  Trash2,
  Sparkles,
  Check,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import {
  AnswerSheet,
  DepartmentCode,
  EvaluatedQuestionScore,
  ExamAnswerKey,
  StudentProfile,
  UserSession
} from '../types';
import {
  enforceCanonicalMarkingScheme,
  buildAttendedQuestionsSummary,
  computeCbcsFromMarks,
  roundHalf,
  clampMark
} from '../utils/answerSheetExcelHelper';
import { getWorkspaceAuthHeaders } from '../utils/staffAuthService';

export interface CapturedSheetPage {
  id: string;
  previewDataUrl: string;
  base64: string;
  mimeType: string;
  label: string;
  isPdf?: boolean;
}

interface AnswerSheetLensModalProps {
  isOpen: boolean;
  initialMode: 'camera' | 'upload';
  onClose: () => void;
  selectedAnswerKey: ExamAnswerKey | null;
  answerKeys: ExamAnswerKey[];
  onSelectAnswerKey: (key: ExamAnswerKey) => void;
  students: StudentProfile[];
  existingSheets?: AnswerSheet[];
  session?: UserSession;
  examSession: 'FN' | 'AN';
  onSaveEvaluationResult: (sheet: AnswerSheet) => Promise<void> | void;
}

function isLikelyMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  return uaMobile || (coarsePointer && window.innerWidth <= 1024);
}

function normalizeReg(val: string): string {
  return String(val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function rotateDataUrl90(dataUrl: string): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const out = canvas.toDataURL('image/jpeg', 0.88);
      resolve({
        dataUrl: out,
        base64: out.replace(/^data:image\/jpeg;base64,/, '')
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation'));
    img.src = dataUrl;
  });
}

export const AnswerSheetLensModal: React.FC<AnswerSheetLensModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  selectedAnswerKey,
  answerKeys,
  onSelectAnswerKey,
  students,
  existingSheets = [],
  session,
  examSession,
  onSaveEvaluationResult
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stabilityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumaRef = useRef<Uint8Array | null>(null);
  const steadyCountRef = useRef<number>(0);
  const autoCapturedOnceRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mobileDefault = useMemo(() => isLikelyMobileDevice(), []);

  const [step, setStep] = useState<'camera' | 'processing' | 'verify'>('camera');
  const [preferredFacing, setPreferredFacing] = useState<'environment' | 'user'>(
    mobileDefault ? 'environment' : 'user'
  );
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flashBlink, setFlashBlink] = useState(false);

  // Fast Auto-Capture state
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(true);
  const [stabilityProgress, setStabilityProgress] = useState<number>(0);

  const [capturedPages, setCapturedPages] = useState<CapturedSheetPage[]>([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [captureSource, setCaptureSource] = useState<'webcam' | 'rear-camera' | 'file-upload'>(
    mobileDefault ? 'rear-camera' : 'webcam'
  );

  const [processingStageIdx, setProcessingStageIdx] = useState(0);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [lastCachedHit, setLastCachedHit] = useState<boolean>(false);

  // Auto-scheme selector when no Answer Key is configured
  const [autoSchemeMaxMarks, setAutoSchemeMaxMarks] = useState<50 | 100>(
    selectedAnswerKey?.maximumMarks === 100 ? 100 : 50
  );

  // Verification editable state
  const [registerNo, setRegisterNo] = useState('');
  const [extractedStudentName, setExtractedStudentName] = useState('');
  const [ocrSubjectCode, setOcrSubjectCode] = useState('');
  const [ocrSubjectName, setOcrSubjectName] = useState('');
  const [extractedQpCode, setExtractedQpCode] = useState('');
  const [extractedYearDept, setExtractedYearDept] = useState('');
  const [pagesUsedCount, setPagesUsedCount] = useState<number>(1);
  const [detectedModeLabel, setDetectedModeLabel] = useState<string>('');
  const [manualStudentId, setManualStudentId] = useState<string>('');
  const [studentSearchFilter, setStudentSearchFilter] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [ocrTranscript, setOcrTranscript] = useState('');
  const [dummyNumber, setDummyNumber] = useState('');
  const [questionEvaluations, setQuestionEvaluations] = useState<EvaluatedQuestionScore[]>([]);
  const [evaluationSourceLabel, setEvaluationSourceLabel] = useState<
    'Gemini Vision OCR + AI' | 'Manual Evaluator Verification'
  >('Gemini Vision OCR + AI');
  const [showTranscript, setShowTranscript] = useState(false);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setTorchOn(false);
    setTorchSupported(false);
    setStabilityProgress(0);
    prevLumaRef.current = null;
    steadyCountRef.current = 0;
  }, []);

  const refreshVideoDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const list = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(list.filter((d) => d.kind === 'videoinput'));
    } catch {
      // ignore enumeration errors
    }
  }, []);

  const startCamera = useCallback(
    async (opts?: { deviceId?: string; facing?: 'environment' | 'user' }) => {
      stopCameraStream();
      setCameraError(null);
      setCameraStarting(true);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraStarting(false);
        setCameraError(
          window.isSecureContext === false
            ? 'Camera access requires a secure HTTPS or localhost connection. Use Upload Image / PDF below.'
            : 'Camera hardware API is unavailable in this browser. Upload a scanned image or PDF instead.'
        );
        return;
      }

      const targetFacing = opts?.facing ?? preferredFacing;
      const constraintsList: MediaStreamConstraints[] = [];

      if (opts?.deviceId) {
        constraintsList.push({
          video: {
            deviceId: { exact: opts.deviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } else {
        constraintsList.push({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      }
      constraintsList.push({ video: true, audio: false });

      let obtainedStream: MediaStream | null = null;
      let lastErr: any = null;

      for (const constraints of constraintsList) {
        try {
          obtainedStream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!obtainedStream) {
        setCameraStarting(false);
        const name = lastErr?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was denied. Allow camera access in your browser site settings and click Retry Camera, or upload a sheet photo/PDF.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError(
            'No webcam or rear camera was detected on this device. Connect a camera or upload an Answer Sheet photo/PDF.'
          );
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraError(
            'Camera is currently in use by another application. Close other camera apps and click Retry Camera.'
          );
        } else {
          setCameraError(
            lastErr?.message ||
              'Unable to start device camera. You can upload an Answer Sheet image or PDF directly.'
          );
        }
        return;
      }

      streamRef.current = obtainedStream;
      const videoTrack = obtainedStream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings?.();
      if (settings?.deviceId) {
        setActiveDeviceId(settings.deviceId);
      }

      try {
        const caps = videoTrack?.getCapabilities?.() as any;
        setTorchSupported(Boolean(caps && caps.torch));
      } catch {
        setTorchSupported(false);
      }

      setCaptureSource(targetFacing === 'environment' ? 'rear-camera' : 'webcam');

      if (videoRef.current) {
        videoRef.current.srcObject = obtainedStream;
        try {
          await videoRef.current.play();
        } catch {
          // autoplay handled by attribute
        }
      }

      setCameraReady(true);
      setCameraStarting(false);
      await refreshVideoDevices();
    },
    [preferredFacing, refreshVideoDevices, stopCameraStream]
  );

  const captureSingleVideoPage = useCallback((): CapturedSheetPage | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady || !video.videoWidth) return null;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const maxW = 1152;
    const scale = vw > maxW ? maxW / vw : 1;
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

    setFlashBlink(true);
    setTimeout(() => setFlashBlink(false), 120);

    return {
      id: `PG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      previewDataUrl: dataUrl,
      base64,
      mimeType: 'image/jpeg',
      label: `Scan Page`
    };
  }, [cameraReady]);

  const runOcrAndAiEvaluation = useCallback(
    async (pagesToEval: CapturedSheetPage[]) => {
      if (pagesToEval.length === 0) {
        setEvalError('Capture at least one Answer Sheet page or upload a sheet photo/PDF first.');
        return;
      }

      const activeKeyPayload = selectedAnswerKey
        ? selectedAnswerKey
        : {
            id: `AUTO-${autoSchemeMaxMarks}M`,
            subjectCode: '',
            subjectName: '',
            maximumMarks: autoSchemeMaxMarks,
            department: session?.department || 'AI&DS',
            semester: 5,
            classYear: 'III',
            section: 'A',
            questions: []
          };

      setEvalError(null);
      setLastLatencyMs(null);
      setLastCachedHit(false);
      setStep('processing');

      try {
        const resp = await fetch('/api/answer-sheets/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getWorkspaceAuthHeaders(session)
          },
          body: JSON.stringify({
            pages: pagesToEval.map((p) => ({
              imageBase64: p.base64,
              mimeType: p.mimeType
            })),
            answerKey: activeKeyPayload,
            studentDirectory: students.map((s) => ({
              id: s.id,
              registerNo: s.registerNo,
              rollNo: s.rollNo,
              name: s.name,
              department: s.department,
              year: s.year,
              semester: s.semester,
              section: s.section,
              cgpa: s.cgpa,
              attendancePercentage: s.attendancePercentage,
              parentName: s.parentName,
              parentPhone: s.parentPhone
            }))
          })
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data?.success) {
          throw new Error(data?.error || `Evaluation request failed (HTTP ${resp.status})`);
        }

        const matched = data.matchedStudent as StudentProfile | null;
        const detectedReg = String(
          matched?.registerNo || data.ocr?.registerNo || data.ocr?.extractedRegisterNo || ''
        ).trim();

        setRegisterNo(detectedReg);
        setExtractedStudentName(String(matched?.name || data.ocr?.studentName || '').trim());
        setOcrSubjectCode(
          String(selectedAnswerKey?.subjectCode || data.ocr?.subjectCode || data.ocr?.qpCode || '')
            .replace(/-[A-Z]$/i, '')
            .trim()
        );
        setOcrSubjectName(
          String(selectedAnswerKey?.subjectName || data.ocr?.subjectName || 'Autonomous Course Valuation').trim()
        );
        setExtractedQpCode(String(data.ocr?.qpCode || '').trim());
        setExtractedYearDept(String(data.ocr?.yearDept || '').trim());
        setPagesUsedCount(Number(data.ocr?.pagesUsed) || pagesToEval.length);
        setDetectedModeLabel(
          data.ocr?.detectedMode === 'cover_mark_grid'
            ? 'VSBEC Cover Sheet Valuation Grid'
            : 'Handwritten Script Evaluation'
        );
        setManualStudentId(matched?.id || '');
        setOcrConfidence(Number(data.ocr?.confidence) || 92);
        setOcrTranscript(String(data.ocr?.transcript || ''));
        setLastLatencyMs(typeof data.latencyMs === 'number' ? data.latencyMs : null);
        setLastCachedHit(Boolean(data.cached));

        const canonicalEvals = enforceCanonicalMarkingScheme(
          Array.isArray(data.questionEvaluations) ? data.questionEvaluations : [],
          selectedAnswerKey
        );
        setQuestionEvaluations(canonicalEvals);
        setEvaluationSourceLabel('Gemini Vision OCR + AI');
        setStep('verify');
      } catch (err: any) {
        setEvalError(err?.message || 'OCR and AI evaluation failed.');
      }
    },
    [selectedAnswerKey, autoSchemeMaxMarks, students, session]
  );

  // Reset & initialize camera on open
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }

    const defaultFacing = isLikelyMobileDevice() ? 'environment' : 'user';
    setPreferredFacing(defaultFacing);
    setStep('camera');
    setCapturedPages([]);
    setActivePreviewIdx(0);
    setEvalError(null);
    setRegisterNo('');
    setExtractedStudentName('');
    setOcrSubjectCode(selectedAnswerKey?.subjectCode || '');
    setOcrSubjectName(selectedAnswerKey?.subjectName || '');
    setExtractedQpCode('');
    setExtractedYearDept('');
    setPagesUsedCount(1);
    setDetectedModeLabel('');
    setManualStudentId('');
    setQuestionEvaluations([]);
    setOcrTranscript('');
    setAutoCaptureEnabled(initialMode === 'camera');
    autoCapturedOnceRef.current = false;
    steadyCountRef.current = 0;
    setStabilityProgress(0);
    setDummyNumber(`DM-${Math.floor(88500 + Math.random() * 490)}`);

    if (initialMode === 'camera') {
      startCamera({ facing: defaultFacing });
    } else {
      const t = setTimeout(() => {
        fileInputRef.current?.click();
      }, 160);
      return () => clearTimeout(t);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, initialMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop camera when leaving camera step
  useEffect(() => {
    if (step !== 'camera') {
      stopCameraStream();
    }
  }, [step, stopCameraStream]);

  // Fast Google Lens-like frame stability detector -> auto-capture & process seamlessly
  useEffect(() => {
    if (
      !isOpen ||
      step !== 'camera' ||
      !cameraReady ||
      !autoCaptureEnabled ||
      autoCapturedOnceRef.current ||
      capturedPages.length > 0
    ) {
      return;
    }

    const warmupTimer = setTimeout(() => {
      const interval = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth) return;

        if (!stabilityCanvasRef.current) {
          stabilityCanvasRef.current = document.createElement('canvas');
        }
        const sc = stabilityCanvasRef.current;
        const w = 64;
        const h = 48;
        sc.width = w;
        sc.height = h;
        const ctx = sc.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, w, h);
        const frame = ctx.getImageData(0, 0, w, h).data;
        const currLuma = new Uint8Array(w * h);
        let lumaSum = 0;
        let brightCount = 0;
        for (let i = 0, p = 0; i < frame.length; i += 4, p++) {
          const y = (frame[i] * 77 + frame[i + 1] * 150 + frame[i + 2] * 29) >> 8;
          currLuma[p] = y;
          lumaSum += y;
          if (y > 40) brightCount++;
        }

        // Ignore nearly pitch-black / covered lens frames
        if (lumaSum / (w * h) < 28 || brightCount < w * h * 0.35) {
          steadyCountRef.current = 0;
          setStabilityProgress(0);
          prevLumaRef.current = currLuma;
          return;
        }

        if (prevLumaRef.current) {
          let totalDiff = 0;
          for (let p = 0; p < currLuma.length; p++) {
            totalDiff += Math.abs(currLuma[p] - prevLumaRef.current[p]);
          }
          const avgDiff = totalDiff / currLuma.length;

          // If scene is steady (< 9.5 luminance shift across center grid), lock quickly (2 frames @ 180ms)
          if (avgDiff < 9.5) {
            steadyCountRef.current += 1;
            const pct = Math.min(100, Math.round((steadyCountRef.current / 2) * 100));
            setStabilityProgress(pct);

            if (steadyCountRef.current >= 2 && !autoCapturedOnceRef.current) {
              autoCapturedOnceRef.current = true;
              const page = captureSingleVideoPage();
              if (page) {
                setCapturedPages([page]);
                setActivePreviewIdx(0);
                runOcrAndAiEvaluation([page]);
              }
            }
          } else {
            steadyCountRef.current = Math.max(0, steadyCountRef.current - 1);
            setStabilityProgress(Math.round((steadyCountRef.current / 2) * 100));
          }
        }
        prevLumaRef.current = currLuma;
      }, 180);

      return () => clearInterval(interval);
    }, 350);

    return () => clearTimeout(warmupTimer);
  }, [
    isOpen,
    step,
    cameraReady,
    autoCaptureEnabled,
    capturedPages.length,
    captureSingleVideoPage,
    runOcrAndAiEvaluation
  ]);

  // Fast processing stage progression (150ms / 350ms)
  useEffect(() => {
    if (step !== 'processing') return;
    setProcessingStageIdx(0);
    const t1 = setTimeout(() => setProcessingStageIdx(1), 150);
    const t2 = setTimeout(() => setProcessingStageIdx(2), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as any]
      });
      setTorchOn(next);
    } catch {
      // device rejected torch constraint
    }
  };

  const handleSwitchCamera = async () => {
    if (videoDevices.length > 1 && activeDeviceId) {
      const currIdx = videoDevices.findIndex((d) => d.deviceId === activeDeviceId);
      const nextDevice = videoDevices[(currIdx + 1) % videoDevices.length];
      await startCamera({ deviceId: nextDevice.deviceId });
      return;
    }
    const nextFacing = preferredFacing === 'environment' ? 'user' : 'environment';
    setPreferredFacing(nextFacing);
    await startCamera({ facing: nextFacing });
  };

  const handleCaptureFrame = () => {
    const page = captureSingleVideoPage();
    if (!page) return;
    setCapturedPages((prev) => {
      const numbered = { ...page, label: `Page ${prev.length + 1}` };
      const next = [...prev, numbered];
      setActivePreviewIdx(next.length - 1);
      return next;
    });
  };

  const compressImageFileToPage = async (
    file: File,
    pageIdx: number
  ): Promise<CapturedSheetPage> => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
        reader.onload = () => {
          const resultUrl = String(reader.result || '');
          resolve({
            id: `PG-${Date.now()}-${pageIdx}`,
            previewDataUrl: '',
            base64: resultUrl.replace(/^data:[^;]+;base64,/, ''),
            mimeType: 'application/pdf',
            label: file.name,
            isPdf: true
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // Use createImageBitmap for proper EXIF orientation normalization where available
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file, {
          imageOrientation: 'from-image'
        } as ImageBitmapOptions);
        const maxW = 1152;
        const scale = bitmap.width > maxW ? maxW / bitmap.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          bitmap.close?.();
          const jpegUrl = canvas.toDataURL('image/jpeg', 0.78);
          return {
            id: `PG-${Date.now()}-${pageIdx}`,
            previewDataUrl: jpegUrl,
            base64: jpegUrl.replace(/^data:image\/jpeg;base64,/, ''),
            mimeType: 'image/jpeg',
            label: file.name
          };
        }
        bitmap.close?.();
      } catch {
        // Fallback to standard Image element below
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.onload = () => {
        const resultUrl = String(reader.result || '');
        const img = new Image();
        img.onload = () => {
          const maxW = 1152;
          const scale = img.width > maxW ? maxW / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const jpegUrl = canvas.toDataURL('image/jpeg', 0.78);
          resolve({
            id: `PG-${Date.now()}-${pageIdx}`,
            previewDataUrl: jpegUrl,
            base64: jpegUrl.replace(/^data:image\/jpeg;base64,/, ''),
            mimeType: 'image/jpeg',
            label: file.name
          });
        };
        img.onerror = () => reject(new Error(`Invalid image file: ${file.name}`));
        img.src = resultUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setEvalError(null);
    try {
      const loaded = await Promise.all(
        files.slice(0, 6).map((f, idx) => compressImageFileToPage(f, idx + capturedPages.length + 1))
      );
      setCaptureSource('file-upload');
      const merged = [...capturedPages, ...loaded];
      setCapturedPages(merged);
      setActivePreviewIdx(merged.length - 1);
      // Automatically run OCR & AI evaluation immediately upon file upload for fast UX
      await runOcrAndAiEvaluation(merged);
    } catch (err: any) {
      setEvalError(err?.message || 'Unable to process uploaded sheet file.');
    }
  };

  const handleRotateActivePreview90 = async () => {
    const current = capturedPages[activePreviewIdx];
    if (!current || current.isPdf || !current.previewDataUrl) return;
    try {
      const rotated = await rotateDataUrl90(current.previewDataUrl);
      setCapturedPages((prev) =>
        prev.map((pg, i) =>
          i === activePreviewIdx
            ? { ...pg, previewDataUrl: rotated.dataUrl, base64: rotated.base64, mimeType: 'image/jpeg' }
            : pg
        )
      );
    } catch {
      // non-fatal
    }
  };

  const handleOpenManualVerificationFallback = () => {
    setEvaluationSourceLabel('Manual Evaluator Verification');
    setOcrConfidence(0);
    setOcrTranscript(`Manual verification initialized with canonical ${autoSchemeMaxMarks}-mark VSBEC scheme.`);
    if (!ocrSubjectCode) setOcrSubjectCode(selectedAnswerKey?.subjectCode || 'GENERAL');
    if (!ocrSubjectName) setOcrSubjectName(selectedAnswerKey?.subjectName || 'Autonomous Course Valuation');
    const canonical = enforceCanonicalMarkingScheme([], selectedAnswerKey);
    setQuestionEvaluations(canonical);
    setEvalError(null);
    setStep('verify');
  };

  // Resolve student live from registerNo or manual override dropdown
  const resolvedStudent = useMemo(() => {
    if (manualStudentId) {
      const byId = students.find((s) => s.id === manualStudentId);
      if (byId) return byId;
    }
    const clean = normalizeReg(registerNo);
    if (!clean || clean.length < 4) return null;
    return (
      students.find(
        (s) =>
          normalizeReg(s.registerNo) === clean ||
          normalizeReg(s.rollNo) === clean ||
          normalizeReg(s.registerNo).endsWith(clean.slice(-5))
      ) || null
    );
  }, [manualStudentId, registerNo, students]);

  // Duplicate guard check
  const activeSubjectCode = (ocrSubjectCode || selectedAnswerKey?.subjectCode || 'GENERAL').trim().toUpperCase();
  const activeSubjectName = (ocrSubjectName || selectedAnswerKey?.subjectName || 'Autonomous Course Valuation').trim();

  const existingDuplicateSheet = useMemo(() => {
    const cleanReg = normalizeReg(resolvedStudent?.registerNo || registerNo);
    const cleanSub = activeSubjectCode;
    if (!cleanReg || cleanReg.length < 4 || !cleanSub) return null;
    return (
      existingSheets.find(
        (s) =>
          normalizeReg(s.registerNo) === cleanReg &&
          String(s.subjectCode || '').trim().toUpperCase() === cleanSub
      ) || null
    );
  }, [existingSheets, registerNo, resolvedStudent, activeSubjectCode]);

  const filteredStudentsForDropdown = useMemo(() => {
    const q = studentSearchFilter.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.registerNo.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q)
    );
  }, [studentSearchFilter, students]);

  const totals = useMemo(() => {
    const configuredMax = Number(selectedAnswerKey?.maximumMarks) || autoSchemeMaxMarks || 50;
    const rawAwarded = questionEvaluations.reduce(
      (s, q) =>
        s + (q.attempted ? clampMark(q.marksAwarded, q.maxMarks) : 0),
      0
    );
    const totalAwarded = roundHalf(Math.min(configuredMax, rawAwarded));
    const cbcs = computeCbcsFromMarks(totalAwarded, configuredMax);
    const attemptedCount = questionEvaluations.filter((q) => q.attempted).length;
    const attendedSummary = buildAttendedQuestionsSummary(questionEvaluations);
    return {
      totalAwarded,
      configuredMax,
      attemptedCount,
      attendedSummary,
      ...cbcs
    };
  }, [questionEvaluations, selectedAnswerKey, autoSchemeMaxMarks]);

  // Enforces Either-Or mutual exclusion (6a vs 6b, 7a vs 7b, 8a vs 8b) on manual toggle/edit
  const handleUpdateQuestionRow = (idx: number, patch: Partial<EvaluatedQuestionScore>) => {
    setQuestionEvaluations((prev) => {
      const target = prev[idx];
      if (!target) return prev;
      const nextAttempted = patch.attempted !== undefined ? patch.attempted : target.attempted;

      return prev.map((q, i) => {
        if (i === idx) {
          let nextMarks =
            patch.marksAwarded !== undefined ? Number(patch.marksAwarded) || 0 : q.marksAwarded;
          if (!nextAttempted) nextMarks = 0;
          nextMarks = clampMark(nextMarks, q.maxMarks);
          return {
            ...q,
            ...patch,
            attempted: nextAttempted,
            marksAwarded: nextMarks,
            extractedStudentAnswer: nextAttempted
              ? patch.extractedStudentAnswer ?? q.extractedStudentAnswer
              : 'Not attempted'
          };
        }

        // If enabling an either-or option, automatically uncheck & zero its twin!
        if (
          nextAttempted &&
          target.eitherOrGroup &&
          q.eitherOrGroup === target.eitherOrGroup &&
          q.questionChoice !== target.questionChoice
        ) {
          return {
            ...q,
            attempted: false,
            marksAwarded: 0,
            extractedStudentAnswer: 'Not attempted',
            feedback: `Not selected (Either-Or Q.${target.eitherOrGroup}${target.questionChoice} chosen)`
          };
        }

        return q;
      });
    });
  };

  const handleConfirmSave = async (status: 'mapped' | 'pending') => {
    const finalRegNo =
      resolvedStudent?.registerNo ||
      registerNo.trim() ||
      `UNMAPPED-${Date.now().toString().slice(-4)}`;
    const finalName =
      resolvedStudent?.name ||
      extractedStudentName.trim() ||
      `Candidate (${finalRegNo})`;
    const firstImg = capturedPages.find((p) => !p.isPdf && p.previewDataUrl)?.previewDataUrl;

    setSaving(true);
    try {
      const sheetPayload: AnswerSheet = {
        id: existingDuplicateSheet?.id || `AS-EVAL-${Date.now()}`,
        barcode: `VSB-${activeSubjectCode}-${finalRegNo}`,
        dummyNumber:
          existingDuplicateSheet?.dummyNumber ||
          dummyNumber.trim() ||
          `DM-${Math.floor(88500 + Math.random() * 490)}`,
        packetNumber: `PKT-${resolvedStudent?.department || selectedAnswerKey?.department || 'AI&DS'}-${resolvedStudent?.section || selectedAnswerKey?.section || 'A'}`,
        registerNo: finalRegNo,
        studentName: finalName,
        department: (resolvedStudent?.department ||
          selectedAnswerKey?.department ||
          'AI&DS') as DepartmentCode,
        semester: resolvedStudent?.semester || selectedAnswerKey?.semester || 5,
        classYear: resolvedStudent?.year || selectedAnswerKey?.classYear || 'III',
        section:
          resolvedStudent?.section ||
          (selectedAnswerKey?.section === 'ALL' ? 'A' : selectedAnswerKey?.section || 'A'),
        subjectCode: activeSubjectCode,
        subjectName: activeSubjectName,
        examDate: selectedAnswerKey?.examDate || new Date().toISOString().slice(0, 10),
        session: examSession,
        totalPagesScanned: Math.max(capturedPages.length, pagesUsedCount || 1),
        status: resolvedStudent || registerNo.trim().length >= 6 ? status : 'pending',
        confidenceScore: ocrConfidence || (status === 'mapped' ? 100 : 85),
        conflictReason: resolvedStudent
          ? undefined
          : 'Extracted Register No was not matched to a Student Registry record — review candidate mapping.',
        scannedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        evaluatorId: session?.staffId || session?.username || 'FACULTY-SCANNER',
        verifiedBy: session?.fullName || 'Department Evaluator',
        answerKeyId: selectedAnswerKey?.id || `AUTO-${totals.configuredMax}M`,
        marksObtained: totals.totalAwarded,
        maxMarks: totals.configuredMax,
        percentage: totals.percentage,
        grade: totals.grade,
        resultStatus: totals.resultStatus,
        questionEvaluations,
        ocrExtractedText: ocrTranscript,
        captureSource,
        capturedImageDataUrl: firstImg,
        extractedQpCode: extractedQpCode || undefined,
        extractedYearDept: extractedYearDept || undefined,
        pagesUsed: pagesUsedCount || capturedPages.length
      };

      await onSaveEvaluationResult(sheetPayload);
      onClose();
    } catch (err: any) {
      setEvalError(err?.message || 'Failed to save evaluated answer sheet results.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* TOP BAR */}
      <div className="shrink-0 px-3 sm:px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-amber-400 text-[#781717] flex items-center justify-center shrink-0 shadow-sm">
            <ScanLine className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white truncate">
              {step === 'camera'
                ? 'Google Lens Answer Sheet Scanner'
                : step === 'processing'
                ? 'Fast OCR & AI Valuation Engine'
                : 'Verify OCR & Marks -> Sync Live Excel'}
            </h2>
            <div className="text-[11px] text-slate-300 truncate flex items-center gap-1.5">
              <span className="font-mono font-bold text-amber-300">
                {selectedAnswerKey?.subjectCode || ocrSubjectCode || `AUTO-${autoSchemeMaxMarks}M`}
              </span>
              <span>·</span>
              <span className="truncate">
                {selectedAnswerKey?.subjectName || ocrSubjectName || 'Auto VSBEC Valuation Grid OCR'}
              </span>
              <span>·</span>
              <span className="font-mono tabular-nums shrink-0">
                {autoSchemeMaxMarks === 100
                  ? '100M Scheme (Pass ≥60)'
                  : '50M Scheme (Q1–5:2M · 6a/b:8M · 7a/b:16M · 8a/b:16M · Pass ≥30)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {step === 'camera' && (
            <>
              <button
                type="button"
                onClick={() => {
                  const next = !autoCaptureEnabled;
                  setAutoCaptureEnabled(next);
                  steadyCountRef.current = 0;
                  setStabilityProgress(0);
                }}
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  autoCaptureEnabled
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  Auto-Scan: {autoCaptureEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {torchSupported && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`min-w-[44px] min-h-[44px] px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    torchOn
                      ? 'bg-amber-400 border-amber-300 text-slate-950'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                  title="Toggle Flash / Torch"
                >
                  {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={handleSwitchCamera}
                className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Switch Camera (Webcam / Rear)"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {preferredFacing === 'environment' ? 'Rear Cam' : 'Webcam'}
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-red-900/70 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Answer Key / Auto Scheme Strip */}
      {step === 'camera' && (
        <div className="shrink-0 bg-slate-900/60 border-b border-slate-800/80 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              {answerKeys.length > 0 ? 'Active Key:' : 'Valuation Mode:'}
            </span>
            {answerKeys.length > 0 ? (
              <select
                value={selectedAnswerKey?.id || ''}
                onChange={(e) => {
                  const found = answerKeys.find((k) => k.id === e.target.value);
                  if (found) onSelectAnswerKey(found);
                }}
                className="flex-1 max-w-md bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {answerKeys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.subjectCode} — {k.subjectName} ({k.examTitle || k.examCategory} · {k.maximumMarks}M)
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 font-bold">
                  Auto VSBEC Cover Grid &amp; OCR (No Answer Key Needed)
                </span>
                <select
                  value={autoSchemeMaxMarks}
                  onChange={(e) => setAutoSchemeMaxMarks(Number(e.target.value) === 100 ? 100 : 50)}
                  className="bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-2 py-1 text-xs font-bold cursor-pointer"
                >
                  <option value={50}>50 Marks (Pass ≥30)</option>
                  <option value={100}>100 Marks (Pass ≥60)</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              {mobileDefault ? 'Mobile Rear Lens' : 'Desktop Webcam'}
            </span>
          </div>
        </div>
      )}

      {/* ============================================================
          STEP 1: GOOGLE LENS LIVE CAMERA VIEWFINDER
         ============================================================ */}
      {step === 'camera' && (
        <div className="flex-1 relative flex flex-col bg-slate-950 overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${cameraReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Uploaded Image / PDF Preview when camera stream is not active */}
            {!cameraReady && !cameraStarting && !cameraError && capturedPages.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950">
                {capturedPages[activePreviewIdx]?.isPdf ? (
                  <div className="p-8 rounded-2xl bg-slate-900 border border-slate-700 text-center text-slate-200">
                    <FileText className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                    <div className="text-sm font-black">{capturedPages[activePreviewIdx].label}</div>
                    <div className="text-xs text-slate-400 mt-1">PDF ready for OCR &amp; evaluation</div>
                  </div>
                ) : (
                  <div className="relative max-w-3xl max-h-full flex flex-col items-center gap-2">
                    <img
                      src={capturedPages[activePreviewIdx]?.previewDataUrl}
                      alt={capturedPages[activePreviewIdx]?.label || 'Uploaded sheet'}
                      className="max-h-[60vh] w-auto object-contain rounded-xl border border-slate-700 shadow-2xl"
                    />
                    <button
                      type="button"
                      onClick={handleRotateActivePreview90}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rotate Preview 90°</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Idle Prompt when Upload mode dialog was closed without picking a file */}
            {!cameraReady && !cameraStarting && !cameraError && capturedPages.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto">
                    <ScanLine className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Ready to Scan or Upload Answer Sheet</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Upload a scanned photo/PDF of the VSBEC answer sheet or start your live device camera.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#781717] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose Sheet Image / PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startCamera({ facing: preferredFacing })}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Open Camera</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {flashBlink && <div className="absolute inset-0 bg-white/80 pointer-events-none z-20" />}

            {/* Google Lens Reticle + Live Auto-Scan Lock Bar */}
            {cameraReady && (
              <div className="pointer-events-none absolute inset-4 sm:inset-10 md:inset-14 flex items-center justify-center">
                <div className="relative w-full max-w-2xl h-full max-h-[76vh] border border-white/15 rounded-2xl overflow-hidden">
                  <span className="absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                  <span className="absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                  <span className="absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                  <span className="absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

                  <div
                    className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                    style={{ top: '42%' }}
                  />

                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-xs text-white text-[11px] font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap border border-white/15 flex items-center gap-2">
                    {autoCaptureEnabled ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="tabular-nums">
                          {stabilityProgress > 0
                            ? `Hold steady to auto-scan (${stabilityProgress}%)`
                            : 'Hold VSBEC Cover Sheet or Answer Page steady in frame'}
                        </span>
                      </>
                    ) : (
                      <span>Manual Shutter Active — align sheet & press capture</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {cameraStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white z-10 p-6 text-center">
                <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-bold">
                  Opening {preferredFacing === 'environment' ? 'Rear Camera' : 'Device Webcam'}...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Approve the browser camera prompt when asked
                </p>
              </div>
            )}

            {cameraError && !cameraStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-10 p-4">
                <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Camera Unavailable</h3>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => startCamera({ facing: preferredFacing })}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#781717] text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4 shrink-0" />
                      <span>Upload Photo / PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {evalError && (
            <div className="bg-red-950/95 border-t border-red-700 px-4 py-2 text-xs text-red-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{evalError}</span>
              </div>
              <button
                type="button"
                onClick={() => setEvalError(null)}
                className="text-red-300 hover:text-white font-bold px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Bottom Lens Controls */}
          <div className="shrink-0 bg-slate-950/95 border-t border-slate-800 px-3 sm:px-6 py-3 space-y-2.5">
            {capturedPages.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {capturedPages.map((pg, idx) => (
                  <div
                    key={pg.id}
                    onClick={() => setActivePreviewIdx(idx)}
                    className={`relative shrink-0 rounded-xl border overflow-hidden flex items-center gap-1.5 bg-slate-900 cursor-pointer ${
                      activePreviewIdx === idx ? 'border-amber-400' : 'border-slate-700'
                    }`}
                  >
                    {pg.isPdf ? (
                      <div className="px-3 py-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span className="max-w-[110px] truncate">{pg.label}</span>
                      </div>
                    ) : (
                      <img
                        src={pg.previewDataUrl}
                        alt={pg.label}
                        className="w-12 h-14 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setCapturedPages((prev) => prev.filter((item) => item.id !== pg.id));
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 cursor-pointer"
                      aria-label={`Remove ${pg.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Upload Image / PDF</span>
              </button>

              <button
                type="button"
                disabled={!cameraReady}
                onClick={handleCaptureFrame}
                className="w-16 h-16 rounded-full bg-white p-1 border-4 border-amber-400 shadow-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 cursor-pointer shrink-0"
                aria-label="Capture Answer Sheet Page"
              >
                <span className="w-full h-full rounded-full bg-[#781717] flex items-center justify-center text-white">
                  <Camera className="w-6 h-6" />
                </span>
              </button>

              <button
                type="button"
                disabled={capturedPages.length === 0}
                onClick={() => runOcrAndAiEvaluation(capturedPages)}
                className="min-h-[48px] px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-[#781717] text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Evaluate {capturedPages.length > 0 ? `(${capturedPages.length})` : ''}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          STEP 2: OCR + DB MATCH + AI VALUATION PROCESSING
         ============================================================ */}
      {step === 'processing' && (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {!evalError ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Scanning &amp; Evaluating Answer Sheet
                    </h3>
                    <p className="text-xs text-slate-400">
                      Running auto-orientation OCR {selectedAnswerKey ? `against ${selectedAnswerKey.subjectCode} Answer Key` : `(${autoSchemeMaxMarks}M Canonical VSBEC Scheme)`}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    'Reading Register No., QP Code, Year/Dept & Marks Grid via OCR',
                    'Fetching Student Name & Profile from Department Database',
                    'Applying 50M Canonical Scheme (1–5:2M · 6a/b:8M · 7a/b:16M · 8a/b:16M)'
                  ].map((label, idx) => {
                    const done = processingStageIdx > idx;
                    const active = processingStageIdx === idx;
                    return (
                      <div
                        key={label}
                        className={`p-3 rounded-xl border text-xs flex items-center gap-3 ${
                          done
                            ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-200'
                            : active
                            ? 'bg-amber-500/10 border-amber-400/50 text-amber-100'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : active ? (
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                        )}
                        <span className="font-semibold">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-700 text-red-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Automated OCR / AI Evaluation Notice
                    </h3>
                    <p className="text-xs text-red-200 mt-1 leading-relaxed">{evalError}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEvalError(null);
                      autoCapturedOnceRef.current = false;
                      setStep('camera');
                      startCamera({ facing: preferredFacing });
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Back to Scanner
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenManualVerificationFallback}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Enter Marks Manually
                  </button>
                  <button
                    type="button"
                    onClick={() => runOcrAndAiEvaluation(capturedPages)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#781717] text-xs font-black cursor-pointer"
                  >
                    Retry AI Evaluation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          STEP 3: VERIFICATION SCREEN BEFORE FINAL SAVE
         ============================================================ */}
      {step === 'verify' && (
        <div className="flex-1 overflow-y-auto bg-slate-100 text-slate-900 p-3 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-5">
            {evalError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{evalError}</span>
              </div>
            )}

            {existingDuplicateSheet && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">Duplicate Prevention Active:</span> An evaluation record already exists for{' '}
                  <span className="font-mono font-bold">{existingDuplicateSheet.registerNo}</span> in{' '}
                  <span className="font-mono font-bold">{existingDuplicateSheet.subjectCode}</span> (previous score{' '}
                  <span className="font-mono font-bold">{existingDuplicateSheet.marksObtained ?? 0}/50</span>). Saving will update that row in-place with zero duplicate entries.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT: Captured Page Preview & Rotate/OCR Summary */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Scanned Script ({capturedPages.length} Pg)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 tabular-nums">
                      OCR {ocrConfidence}% · {evaluationSourceLabel === 'Gemini Vision OCR + AI' ? 'AI Verified' : 'Manual'}
                      {lastLatencyMs !== null ? ` · ${(lastLatencyMs / 1000).toFixed(2)}s` : ''}
                      {lastCachedHit ? ' (Cached)' : ''}
                    </span>
                  </div>

                  {capturedPages[activePreviewIdx] && (
                    <div className="rounded-xl border border-slate-200 bg-slate-900 overflow-hidden relative">
                      {capturedPages[activePreviewIdx].isPdf ? (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-200 p-4 text-center">
                          <FileText className="w-10 h-10 text-amber-400 mb-2" />
                          <span className="text-xs font-bold break-all">
                            {capturedPages[activePreviewIdx].label}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-1">PDF Document Attached</span>
                        </div>
                      ) : (
                        <img
                          src={capturedPages[activePreviewIdx].previewDataUrl}
                          alt="Captured Answer Sheet"
                          className="w-full max-h-72 object-contain mx-auto"
                        />
                      )}
                    </div>
                  )}

                  {capturedPages[activePreviewIdx] && !capturedPages[activePreviewIdx].isPdf && (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleRotateActivePreview90}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotate 90°</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => runOcrAndAiEvaluation(capturedPages)}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Re-run OCR</span>
                      </button>
                    </div>
                  )}

                  {capturedPages.length > 1 && (
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        disabled={activePreviewIdx === 0}
                        onClick={() => setActivePreviewIdx((i) => Math.max(0, i - 1))}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                      </button>
                      <span className="font-mono font-bold text-slate-600 tabular-nums">
                        Page {activePreviewIdx + 1} / {capturedPages.length}
                      </span>
                      <button
                        type="button"
                        disabled={activePreviewIdx >= capturedPages.length - 1}
                        onClick={() =>
                          setActivePreviewIdx((i) => Math.min(capturedPages.length - 1, i + 1))
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {(detectedModeLabel || extractedQpCode || extractedYearDept) && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      {detectedModeLabel && (
                        <div className="font-bold text-[#781717]">{detectedModeLabel}</div>
                      )}
                      {extractedQpCode && (
                        <div>
                          <span className="text-slate-500 font-semibold">QP Code:</span>{' '}
                          <span className="font-mono font-bold text-slate-800">{extractedQpCode}</span>
                        </div>
                      )}
                      {extractedYearDept && (
                        <div>
                          <span className="text-slate-500 font-semibold">Year &amp; Dept:</span>{' '}
                          <span className="font-bold text-slate-800">{extractedYearDept}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 font-semibold">Pages Used:</span>{' '}
                        <span className="font-mono font-bold text-slate-800">{pagesUsedCount}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={() => setShowTranscript((v) => !v)}
                      className="text-xs font-bold text-[#781717] hover:underline cursor-pointer"
                    >
                      {showTranscript ? 'Hide OCR Summary' : 'Show Extracted OCR Summary'}
                    </button>
                    {showTranscript && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {ocrTranscript || 'No raw OCR summary returned.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Student Lookup & Canonical 50M Question Verification */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#781717]" />
                      <h3 className="text-sm font-black text-slate-900">
                        Automatic Student Identification &amp; Registry Lookup
                      </h3>
                    </div>
                    {resolvedStudent ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Matched in Department Database
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Register No. not in DB — verify or select candidate
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Register Number (OCR)
                      </label>
                      <input
                        type="text"
                        value={registerNo}
                        onChange={(e) => {
                          setRegisterNo(e.target.value);
                          setManualStudentId('');
                        }}
                        placeholder="e.g. 922523243109"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Subject Code (OCR / Manual)
                      </label>
                      <input
                        type="text"
                        value={ocrSubjectCode}
                        onChange={(e) => setOcrSubjectCode(e.target.value.toUpperCase())}
                        placeholder="e.g. 23GET701"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs text-[#781717] focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Course Name / Dummy ID
                      </label>
                      <input
                        type="text"
                        value={ocrSubjectName}
                        onChange={(e) => setOcrSubjectName(e.target.value)}
                        placeholder="Course Title"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Select / Override Candidate
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={studentSearchFilter}
                          onChange={(e) => setStudentSearchFilter(e.target.value)}
                          placeholder="Filter by reg/name..."
                          className="w-full pl-8 pr-2.5 py-1.5 mb-1.5 rounded-lg border border-slate-200 text-[11px] bg-slate-50"
                        />
                      </div>
                      <select
                        value={resolvedStudent?.id || manualStudentId || ''}
                        onChange={(e) => {
                          const id = e.target.value;
                          setManualStudentId(id);
                          const st = students.find((s) => s.id === id);
                          if (st) {
                            setRegisterNo(st.registerNo);
                            setExtractedStudentName(st.name);
                          }
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 cursor-pointer"
                      >
                        <option value="">-- Choose Candidate --</option>
                        {filteredStudentsForDropdown.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.registerNo} — {s.name} ({s.year}-{s.section})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {resolvedStudent && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Student Name
                        </span>
                        <span className="font-black text-slate-900">{resolvedStudent.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Class &amp; Roll No
                        </span>
                        <span className="font-semibold text-slate-800">
                          {resolvedStudent.department} {resolvedStudent.year}-{resolvedStudent.section} ·{' '}
                          <span className="font-mono">{resolvedStudent.rollNo}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Academic Standing
                        </span>
                        <span className="font-mono font-bold text-slate-800 tabular-nums">
                          CGPA {resolvedStudent.cgpa.toFixed(2)} · Attd {resolvedStudent.attendancePercentage}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Guardian Contact
                        </span>
                        <span className="font-medium text-slate-700 block truncate">
                          {resolvedStudent.parentName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {resolvedStudent.parentPhone}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Canonical Question-Wise Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Canonical {totals.configuredMax}-Mark Valuation Verification ({activeSubjectCode})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Attended Questions: <strong className="font-mono text-slate-800">{totals.attendedSummary}</strong> · Either-Or auto-prevents double counting on Q6, Q7, Q8
                      </p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold tabular-nums">
                      <span className="px-2.5 py-1 rounded-lg bg-[#781717] text-white">
                        Total: {totals.totalAwarded} / {totals.configuredMax} ({totals.percentage}%)
                      </span>
                      <span
                        className={`px-2 py-1 rounded-lg font-black ${
                          totals.resultStatus === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {totals.grade} · {totals.resultStatus}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Q.No</th>
                          <th className="py-2.5 px-3 text-center">Attended</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Question &amp; Extracted Response</th>
                          <th className="py-2.5 px-3 min-w-[160px]">Examiner Note</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Marks</th>
                          <th className="py-2.5 px-3 text-center">Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {questionEvaluations.map((row, idx) => (
                          <tr
                            key={`${row.subDivision}-${idx}`}
                            className={row.attempted ? 'bg-white' : 'bg-slate-50/70 text-slate-400'}
                          >
                            <td className="py-2.5 px-3 align-top font-mono font-bold whitespace-nowrap">
                              <div className={row.attempted ? 'text-slate-900' : 'text-slate-500'}>
                                Q{row.subDivision || row.questionNo}
                              </div>
                              <div className="text-[10px] font-normal text-slate-500">
                                {row.eitherOrGroup ? `Either Q${row.eitherOrGroup}` : row.part}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 align-top text-center">
                              <input
                                type="checkbox"
                                checked={row.attempted}
                                onChange={(e) =>
                                  handleUpdateQuestionRow(idx, { attempted: e.target.checked })
                                }
                                className="w-4 h-4 accent-[#781717] cursor-pointer"
                                aria-label={`Question ${row.subDivision} attempted`}
                              />
                            </td>

                            <td className="py-2.5 px-3 align-top space-y-1">
                              <div className={row.attempted ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}>
                                {row.questionText}
                              </div>
                              {row.attempted && row.extractedStudentAnswer && (
                                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                  {row.extractedStudentAnswer}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 align-top">
                              <input
                                type="text"
                                value={row.feedback || ''}
                                onChange={(e) =>
                                  handleUpdateQuestionRow(idx, { feedback: e.target.value })
                                }
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781717]"
                              />
                            </td>

                            <td className="py-2.5 px-3 align-top text-right">
                              <input
                                type="number"
                                min={0}
                                max={row.maxMarks}
                                step={0.5}
                                disabled={!row.attempted}
                                value={row.marksAwarded}
                                onChange={(e) =>
                                  handleUpdateQuestionRow(idx, {
                                    marksAwarded: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono font-black text-slate-900 tabular-nums disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                              />
                            </td>

                            <td className="py-2.5 px-3 align-top text-center font-mono font-bold text-slate-600 tabular-nums">
                              {row.maxMarks}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Final Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      autoCapturedOnceRef.current = false;
                      setStep('camera');
                      startCamera({ facing: preferredFacing });
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake / Scan Next</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleConfirmSave('pending')}
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Save Pending Review
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleConfirmSave('mapped')}
                      className="min-h-[44px] px-5 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 text-amber-300" />
                      <span>{saving ? 'Syncing to Live Excel...' : 'Confirm & Sync to Live Excel'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
