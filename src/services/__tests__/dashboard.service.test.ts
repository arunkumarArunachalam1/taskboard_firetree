import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dashboardService from '../dashboard.service';

describe('dashboard.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractTextFromHTML', () => {
    it('removes HTML tags and returns plain text', () => {
      const html = '<p>Hello <b>World</b></p>';
      const result = dashboardService.extractTextFromHTML(html);
      expect(result).toBe('Hello World');
    });

    it('returns original input if input is not a string', () => {
      const result = dashboardService.extractTextFromHTML(null as any);
      expect(result).toBeNull();
    });
  });

  describe('extractHrefFromHTML', () => {
    it('extracts the href attribute from an anchor tag', () => {
      const html = '<a href="/test/url">Link</a>';
      const result = dashboardService.extractHrefFromHTML(html);
      expect(result).toBe('/test/url');
    });

    it('returns null if no href is found', () => {
      const html = '<span>No link here</span>';
      const result = dashboardService.extractHrefFromHTML(html);
      expect(result).toBeNull();
    });
  });

  describe('getTaskTypes', () => {
    it('fetches and formats task types correctly', async () => {
      // Mock global fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          COLUMNS: ['TASKTYPEID', 'TASKTYPENAME'],
          DATA: [[1, 'General'], [2, 'Whereabouts']]
        })
      });

      const result = await dashboardService.getTaskTypes();
      
      expect((globalThis.fetch as any).mock.calls[0][0]).toBe('/ReactTaskBoard/GetTaskTypes');
      expect(result).toEqual([
        { TASKTYPEID: 1, TASKTYPENAME: 'General', Tasktypeid: 1, Tasktypename: 'General', tasktypeid: 1, tasktypename: 'General' },
        { TASKTYPEID: 2, TASKTYPENAME: 'Whereabouts', Tasktypeid: 2, Tasktypename: 'Whereabouts', tasktypeid: 2, tasktypename: 'Whereabouts' }
      ]);
    });

    it('throws an error if the fetch fails', async () => {
      // Mock global fetch for failure
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
        statusText: 'Internal Server Error'
      });

      await expect(dashboardService.getTaskTypes()).rejects.toThrow('Request failed with status 500: Internal Server Error');
    });
  });
});
