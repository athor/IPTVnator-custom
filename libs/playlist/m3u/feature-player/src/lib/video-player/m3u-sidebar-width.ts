/** Width migration is idempotent and retains the previous persisted value. */
export function resolveM3uSidebarWidth(
    key: string,
    storage: Pick<Storage, 'getItem' | 'setItem'>
): number {
    const groups = key === 'm3u-groups-sidebar-width';
    let width = Number.parseInt(
        storage.getItem(key) ??
            (groups ? storage.getItem('m3u-sidebar-width') : '') ??
            '',
        10
    );
    if (groups && !storage.getItem('m3u-groups-layout-v2')) {
        const nav = Math.max(
            264,
            Math.min(
                480,
                Number.parseInt(
                    storage.getItem('m3u-groups-nav-width-v2') ??
                        storage.getItem('m3u-groups-nav-width') ??
                        '',
                    10
                ) || 264
            )
        );
        const live = Math.max(
            320,
            Math.min(
                600,
                Number.parseInt(
                    storage.getItem('live-channels-sidebar-width') ?? '',
                    10
                ) || 400
            )
        );
        storage.setItem(
            'm3u-groups-width-before-v2',
            storage.getItem(key) ?? ''
        );
        storage.setItem('m3u-groups-nav-width-v2', String(nav));
        width = nav + live + 8;
        storage.setItem(key, String(width));
        storage.setItem('m3u-groups-layout-v2', '1');
    }
    return Math.max(
        groups ? 592 : 200,
        Math.min(
            groups ? 1200 : 600,
            Number.isNaN(width) ? (groups ? 672 : 460) : width
        )
    );
}
