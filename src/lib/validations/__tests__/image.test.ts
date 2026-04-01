import { describe, it } from 'vitest';

describe('validateImageFile', () => {
  describe('正常系: 許可されたファイル形式', () => {
    // JPEG
    it.todo('image/jpeg のファイルを渡した場合、valid: true が返ること');

    // PNG
    it.todo('image/png のファイルを渡した場合、valid: true が返ること');

    // WebP
    it.todo('image/webp のファイルを渡した場合、valid: true が返ること');
  });

  describe('ファイル形式の異常系', () => {
    // GIF
    it.todo('image/gif のファイルを渡した場合、valid: false とエラーメッセージが返ること');

    // SVG
    it.todo('image/svg+xml のファイルを渡した場合、valid: false とエラーメッセージが返ること');

    // BMP
    it.todo('image/bmp のファイルを渡した場合、valid: false とエラーメッセージが返ること');
  });

  describe('ファイルサイズ', () => {
    // 5MBちょうどはOK
    it.todo('サイズが5MB(5242880バイト)ちょうどの場合、valid: true が返ること');

    // 5MB超過は拒否
    it.todo('サイズが5MB超(5242881バイト)の場合、valid: false とエラーメッセージが返ること');

    // 0バイトはOK（形式が正しければ）
    it.todo('サイズが0バイトでも形式が正しければ、valid: true が返ること');
  });

  describe('複合条件', () => {
    // サイズもタイプも不正な場合、どちらのエラーが返るか
    it.todo('サイズ超過かつ不正な形式の場合、サイズのエラーメッセージが返ること');
  });
});
