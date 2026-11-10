import {
    VideoPlayer,
    type EmbeddedMpvSession,
} from '@iptvnator/shared/interfaces';

export interface InlinePlayerInfo {
    player: VideoPlayer;
    width: number;
    height: number;
    videoCodec?: string;
    audioCodec?: string;
    audioChannels?: string;
    fps?: number;
    videoBitrateBps?: number;
    container?: string;
    bufferedAheadSeconds?: number;
}
export interface InlinePlayerToolsApi {
    embeddedSupported: boolean;
    read(): InlinePlayerInfo;
    switchTo(player: VideoPlayer): Promise<void>;
    translate?(key: string): string;
    locale?(): string;
}
export function readInlinePlayerInfo(
    host: HTMLElement,
    player: VideoPlayer,
    native: EmbeddedMpvSession | null
): InlinePlayerInfo {
    const session = player === VideoPlayer.EmbeddedMpv ? native : null;
    const video =
        player === VideoPlayer.EmbeddedMpv ? null : host.querySelector('video');
    return {
        ...session?.stats,
        player,
        width: session?.videoWidth ?? video?.videoWidth ?? 0,
        height: session?.videoHeight ?? video?.videoHeight ?? 0,
    };
}

type InlinePlayerTranslate = (key: string) => string;
const inlinePlayerDefaultText: Record<string, string> = {
    "SETTINGS.VIDEO_PLAYER_LABEL": "Video player",
    "SETTINGS.PLAYER_HTML5": "HTML5 video player",
    "SETTINGS.PLAYER_VIDEOJS": "Video.js player",
    "SETTINGS.PLAYER_ARTPLAYER": "ArtPlayer",
    "SETTINGS.PLAYER_EMBEDDED_MPV": "Embedded MPV (Experimental)",
    "SETTINGS.SETTINGS_SAVE_FAILED": "Settings could not be saved. Your changes will be lost when the app is restarted.",
    "EMBEDDED_MPV.PLAYER.STREAM_INFO": "Stream info",
    "EMBEDDED_MPV.PLAYER.STATS_RESOLUTION": "Resolution",
    "EMBEDDED_MPV.PLAYER.STATS_FRAME_RATE": "Frame rate",
    "EMBEDDED_MPV.PLAYER.STATS_STREAM_BITRATE": "Stream bitrate",
    "EMBEDDED_MPV.PLAYER.STATS_VIDEO": "Video",
    "EMBEDDED_MPV.PLAYER.STATS_AUDIO": "Audio",
    "EMBEDDED_MPV.PLAYER.STATS_AUDIO_CHANNELS": "Channels",
    "EMBEDDED_MPV.PLAYER.STATS_CONTAINER": "Container",
    "EMBEDDED_MPV.PLAYER.STATS_BUFFER": "Buffer",
    "EMBEDDED_MPV.PLAYER.STATS_UNAVAILABLE": "No stream data yet"
};
const inlinePlayerNameKeys: Partial<Record<VideoPlayer, string>> = {
    videojs: 'SETTINGS.PLAYER_VIDEOJS',
    html5: 'SETTINGS.PLAYER_HTML5',
    artplayer: 'SETTINGS.PLAYER_ARTPLAYER',
    'embedded-mpv': 'SETTINGS.PLAYER_EMBEDDED_MPV',
};
const defaultInlinePlayerText: InlinePlayerTranslate = (key) => inlinePlayerDefaultText[key] ?? key;
export function inlinePlayerInfoText(
    model: InlinePlayerInfo,
    translate: InlinePlayerTranslate = defaultInlinePlayerText,
    locale = 'en'
) {
    const t = (key: string) => translate(key);
    const stats = (key: string) => t('EMBEDDED_MPV.PLAYER.' + key);
    const positive = (value: unknown): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0;
    const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
    const number = (value: number, digits: number) => {
        const language = ({by: 'be', zhtw: 'zh-TW', ary: 'ar-MA'} as Record<string, string>)[locale] ?? locale;
        try { return value.toLocaleString(language, {maximumFractionDigits: digits}); }
        catch { return value.toLocaleString('en', {maximumFractionDigits: digits}); }
    };
    const resolution = positive(model.width) && positive(model.height)
        ? `${Math.round(model.width)} × ${Math.round(model.height)}` : '';
    const nameKey = inlinePlayerNameKeys[model.player];
    const details = [
        `${t('SETTINGS.VIDEO_PLAYER_LABEL')}: ${nameKey ? t(nameKey) : model.player}`,
        `${stats('STATS_RESOLUTION')}: ${resolution || stats('STATS_UNAVAILABLE')}`,
    ];
    if (text(model.videoCodec)) details.push(`${stats('STATS_VIDEO')}: ${text(model.videoCodec)}`);
    if (positive(model.fps)) details.push(`${stats('STATS_FRAME_RATE')}: ${number(model.fps, 2)} fps`);
    if (positive(model.videoBitrateBps)) details.push(`${stats('STATS_STREAM_BITRATE')}: ${number(model.videoBitrateBps / 1000000, 2)} Mbit/s`);
    if (text(model.audioCodec)) details.push(`${stats('STATS_AUDIO')}: ${text(model.audioCodec)}`);
    if (text(model.audioChannels)) details.push(`${stats('STATS_AUDIO_CHANNELS')}: ${text(model.audioChannels)}`);
    if (text(model.container)) details.push(`${stats('STATS_CONTAINER')}: ${text(model.container)}`);
    if (typeof model.bufferedAheadSeconds === 'number' && Number.isFinite(model.bufferedAheadSeconds) && model.bufferedAheadSeconds >= 0)
        details.push(`${stats('STATS_BUFFER')}: ${number(model.bufferedAheadSeconds, 1)} s`);
    return {resolution, details: details.join('\n')};
}

export function createInlinePlayerTools(
    host: HTMLElement,
    api: InlinePlayerToolsApi
) {
    const t = (key: string) => {
        const value = api.translate?.(key);
        return typeof value === 'string' && value.length > 0 && value !== key
            ? value : defaultInlinePlayerText(key);
    };
    const doc = host.ownerDocument;
    const root = doc.createElement('div');
    root.className = 'inline-player-tools';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', t('SETTINGS.VIDEO_PLAYER_LABEL') + ' / ' + t('EMBEDDED_MPV.PLAYER.STREAM_INFO'));
    const row = doc.createElement('div');
    row.className = 'inline-player-tools-row';
    const label = doc.createElement('label');
    label.className = 'inline-player-tools-label';
    const caption = doc.createElement('span');
    caption.textContent = t('SETTINGS.VIDEO_PLAYER_LABEL');
    const select = doc.createElement('select');
    select.className = 'inline-player-tools-select';
    select.setAttribute('aria-label', t('SETTINGS.VIDEO_PLAYER_LABEL'));
    select.setAttribute('data-test-id', 'inline-player-select');
    for (const [value, key] of Object.entries(inlinePlayerNameKeys)) {
        if (!key || (value === 'embedded-mpv' && !api.embeddedSupported)) continue;
        const option = doc.createElement('option');
        option.value = value;
        option.textContent = t(key);
        select.appendChild(option);
    }
    label.appendChild(caption);
    label.appendChild(select);
    const summary = doc.createElement('span');
    summary.className = 'inline-player-tools-resolution';
    summary.setAttribute('aria-label', t('EMBEDDED_MPV.PLAYER.STATS_RESOLUTION'));
    summary.setAttribute('aria-live', 'polite');
    summary.setAttribute('data-test-id', 'inline-player-resolution');
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'inline-player-tools-info';
    button.textContent = 'ⓘ ' + t('EMBEDDED_MPV.PLAYER.STREAM_INFO');
    button.setAttribute('aria-label', t('EMBEDDED_MPV.PLAYER.STREAM_INFO'));
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('data-test-id', 'inline-player-stream-info');
    const panel = doc.createElement('div');
    panel.className = 'inline-player-tools-panel';
    panel.hidden = true;
    panel.id = 'inline-player-info-' + Math.random().toString(36).slice(2);
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', t('EMBEDDED_MPV.PLAYER.STREAM_INFO'));
    button.setAttribute('aria-controls', panel.id);
    const status = doc.createElement('span');
    status.className = 'inline-player-tools-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    row.appendChild(label);
    row.appendChild(summary);
    row.appendChild(button);
    root.appendChild(row);
    root.appendChild(panel);
    root.appendChild(status);
    host.classList.add('inline-player-tools-host');
    host.prepend(root);
    let disposed = false;
    let busy = false;
    const setText = (node: HTMLElement, value: string) => {
        if (node.textContent !== value) node.textContent = value;
    };
    function refresh(model = api.read()) {
        if (disposed) return;
        if (select.value !== model.player) select.value = model.player;
        const playerLabel = t('SETTINGS.VIDEO_PLAYER_LABEL');
        const streamLabel = t('EMBEDDED_MPV.PLAYER.STREAM_INFO');
        const setLabel = (node: HTMLElement, value: string) => {
            if (node.getAttribute('aria-label') !== value) node.setAttribute('aria-label', value);
        };
        setLabel(root, playerLabel + ' / ' + streamLabel);
        setLabel(select, playerLabel);
        setLabel(button, streamLabel);
        setLabel(panel, streamLabel);
        setLabel(summary, t('EMBEDDED_MPV.PLAYER.STATS_RESOLUTION'));
        setText(caption, playerLabel);
        setText(button, 'ⓘ ' + streamLabel);
        for (const option of Array.from(select.options)) {
            const key = inlinePlayerNameKeys[option.value as VideoPlayer];
            if (key) setText(option, t(key));
        }
        if (!status.hidden) setText(status, t('SETTINGS.SETTINGS_SAVE_FAILED'));
        const info = inlinePlayerInfoText(model, t, api.locale?.() || 'en');
        setText(summary, info.resolution || t('EMBEDDED_MPV.PLAYER.STATS_UNAVAILABLE'));
        if (!panel.hidden) setText(panel, info.details);
    }
    async function change(event: Event) {
        event.stopPropagation();
        if (disposed || busy) {
            refresh();
            return;
        }
        const allowed = [
            VideoPlayer.VideoJs,
            VideoPlayer.Html5Player,
            VideoPlayer.ArtPlayer,
            ...(api.embeddedSupported ? [VideoPlayer.EmbeddedMpv] : []),
        ];
        const player = allowed.find((value) => value === select.value);
        if (!player || player === api.read().player) {
            refresh();
            return;
        }
        busy = true;
        select.disabled = true;
        status.hidden = true;
        try {
            await api.switchTo(player);
        } catch {
            if (!disposed) {
                status.textContent = t('SETTINGS.SETTINGS_SAVE_FAILED');
                status.hidden = false;
            }
        } finally {
            busy = false;
            if (!disposed) {
                select.disabled = false;
                refresh();
            }
        }
    }
    function toggle(event: Event) {
        event.stopPropagation();
        panel.hidden = !panel.hidden;
        button.setAttribute('aria-expanded', String(!panel.hidden));
        refresh();
    }
    const stop = (event: Event) => event.stopPropagation();
    const mediaRefresh = () => refresh();
    select.addEventListener('change', change);
    button.addEventListener('click', toggle);
    for (const type of ['click', 'dblclick', 'keydown'])
        root.addEventListener(type, stop);
    for (const type of ['loadedmetadata', 'resize', 'emptied'])
        host.addEventListener(type, mediaRefresh, true);
    refresh();
    return {
        refresh,
        dispose() {
            if (disposed) return;
            disposed = true;
            select.removeEventListener('change', change);
            button.removeEventListener('click', toggle);
            for (const type of ['click', 'dblclick', 'keydown'])
                root.removeEventListener(type, stop);
            for (const type of ['loadedmetadata', 'resize', 'emptied'])
                host.removeEventListener(type, mediaRefresh, true);
            root.remove();
            host.classList.remove('inline-player-tools-host');
        },
    };
}
