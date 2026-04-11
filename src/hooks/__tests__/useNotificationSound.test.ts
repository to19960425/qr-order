import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- AudioContext mock ---------------------------------------------------
// 各テストで生成されたインスタンスを追跡するため、最後に作られたインスタンスを保持
let lastCtx: ReturnType<typeof createMockCtx>;
let audioContextSpy: ReturnType<typeof vi.fn>;

function createMockCtx() {
  return {
    currentTime: 0,
    createOscillator: vi.fn(() => lastOscillator),
    createGain: vi.fn(() => lastGain),
    destination: {},
    close: vi.fn(() => Promise.resolve()),
  };
}

let lastOscillator: {
  type: OscillatorType;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

let lastGain: {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
};

function createMockOscillator() {
  return {
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockGain() {
  return {
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
}

const STORAGE_KEY = 'qr-order:notification-enabled';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();

  lastOscillator = createMockOscillator();
  lastGain = createMockGain();
  lastCtx = createMockCtx();

  audioContextSpy = vi.fn(function () { return lastCtx; });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).AudioContext = audioContextSpy;
});

afterEach(() => {
  window.localStorage.clear();
});

async function importHook() {
  const mod = await import('../useNotificationSound');
  return mod.useNotificationSound;
}

describe('useNotificationSound', () => {
  describe('初期状態', () => {
    it('localStorageに有効化フラグがない場合、通知が無効状態であること', async () => {
      // Arrange
      const useNotificationSound = await importHook();

      // Act
      const { result } = renderHook(() => useNotificationSound());

      // Assert
      expect(result.current.isEnabled).toBe(false);
    });

    it('localStorageに有効化フラグがある場合、自動でAudioContext初期化を試みること', async () => {
      // Arrange
      window.localStorage.setItem(STORAGE_KEY, 'true');
      const useNotificationSound = await importHook();

      // Act
      const { result } = renderHook(() => useNotificationSound());

      // Assert
      expect(result.current.isEnabled).toBe(true);
      expect(audioContextSpy).toHaveBeenCalled();
    });
  });

  describe('有効化', () => {
    it('enableNotification呼び出しでAudioContextが初期化されること', async () => {
      // Arrange
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());

      // Act
      act(() => {
        result.current.enableNotification();
      });

      // Assert
      expect(audioContextSpy).toHaveBeenCalled();
    });

    it('有効化後、localStorageに有効化フラグが保存されること', async () => {
      // Arrange
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());

      // Act
      act(() => {
        result.current.enableNotification();
      });

      // Assert
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('有効化後、isEnabledがtrueになること', async () => {
      // Arrange
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());

      // Act
      act(() => {
        result.current.enableNotification();
      });

      // Assert
      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('通知音の再生', () => {
    it('有効状態でplayNotification呼び出し時、OscillatorNodeでビープ音が生成されること', async () => {
      // Arrange
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());
      act(() => {
        result.current.enableNotification();
      });

      // Act
      act(() => {
        result.current.playNotification();
      });

      // Assert
      expect(lastCtx.createOscillator).toHaveBeenCalled();
      expect(lastOscillator.start).toHaveBeenCalled();
      expect(lastOscillator.stop).toHaveBeenCalled();
    });

    it('無効状態でplayNotification呼び出し時、何も再生されないこと', async () => {
      // Arrange
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());

      // Act
      act(() => {
        result.current.playNotification();
      });

      // Assert
      expect(lastCtx.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('Web Audio APIパラメータ', () => {
    it('OscillatorNodeの周波数が指定値（例: 800Hz）で設定されること', async () => {
      // Arrange
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());
      act(() => {
        result.current.enableNotification();
      });

      // Act
      act(() => {
        result.current.playNotification();
      });

      // Assert
      expect(lastOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
        800,
        expect.any(Number),
      );
    });

    it('音の長さが指定値（例: 0.2秒）で停止すること', async () => {
      // Arrange
      lastCtx.currentTime = 10;
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());
      act(() => {
        result.current.enableNotification();
      });

      // Act
      act(() => {
        result.current.playNotification();
      });

      // Assert
      expect(lastOscillator.stop).toHaveBeenCalledWith(
        expect.closeTo(10 + 0.2, 1),
      );
    });
  });

  describe('ブラウザ自動再生ポリシー対応', () => {
    it('AudioContext初期化が失敗した場合、isEnabledがfalseのままであること', async () => {
      // Arrange
      audioContextSpy.mockImplementation(() => {
        throw new Error('NotAllowedError');
      });
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());

      // Act
      act(() => {
        result.current.enableNotification();
      });

      // Assert
      expect(result.current.isEnabled).toBe(false);
    });

    it('AudioContext初期化が失敗した場合、localStorageにフラグが保存されないこと', async () => {
      // Arrange
      audioContextSpy.mockImplementation(() => {
        throw new Error('NotAllowedError');
      });
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());

      // Act
      act(() => {
        result.current.enableNotification();
      });

      // Assert
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('エッジケース', () => {
    it('連続して複数回playNotificationを呼んでもエラーにならないこと', async () => {
      // Arrange
      const useNotificationSound = await importHook();
      const { result } = renderHook(() => useNotificationSound());
      act(() => {
        result.current.enableNotification();
      });

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.playNotification();
          result.current.playNotification();
          result.current.playNotification();
        });
      }).not.toThrow();
    });

    it('アンマウント時にAudioContextがcloseされること', async () => {
      // Arrange
      const useNotificationSound = await importHook();
      const { result, unmount } = renderHook(() => useNotificationSound());
      act(() => {
        result.current.enableNotification();
      });

      // Act
      unmount();

      // Assert
      expect(lastCtx.close).toHaveBeenCalled();
    });
  });
});
