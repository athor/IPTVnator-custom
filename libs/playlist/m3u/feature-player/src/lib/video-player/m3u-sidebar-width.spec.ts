import { resolveM3uSidebarWidth } from './m3u-sidebar-width';
describe('M3U group layout widths', () => {
    beforeEach(() => localStorage.clear());
    it('gives both groups and channel logos room on first load', () => {
        localStorage.setItem('m3u-groups-sidebar-width', '460');
        localStorage.setItem('live-channels-sidebar-width', '420');
        expect(
            resolveM3uSidebarWidth('m3u-groups-sidebar-width', localStorage)
        ).toBe(692);
        expect(localStorage.getItem('m3u-groups-width-before-v2')).toBe('460');
        expect(localStorage.getItem('m3u-groups-nav-width-v2')).toBe('264');
    });
    it('retains a later resize and the original migration backup', () => {
        resolveM3uSidebarWidth('m3u-groups-sidebar-width', localStorage);
        localStorage.setItem('m3u-groups-sidebar-width', '920');
        expect(
            resolveM3uSidebarWidth('m3u-groups-sidebar-width', localStorage)
        ).toBe(920);
        expect(localStorage.getItem('m3u-groups-width-before-v2')).toBe('');
    });
    it('keeps the ordinary channel sidebar narrow', () => {
        localStorage.setItem('m3u-sidebar-width', '990');
        expect(resolveM3uSidebarWidth('m3u-sidebar-width', localStorage)).toBe(
            600
        );
        expect(localStorage.getItem('m3u-sidebar-width')).toBe('990');
        expect(localStorage.getItem('m3u-groups-layout-v2')).toBeNull();
    });
});
