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

export function inlinePlayerInfoText(model: InlinePlayerInfo) {
    const names: Partial<Record<VideoPlayer, string>> = {
        videojs: 'Video.js',
        html5: 'HTML5',
        artplayer: 'ArtPlayer',
        'embedded-mpv': 'Embedded MPV',
    };
    const positive = (value: unknown): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0;
    const text = (value: unknown): string =>
        typeof value === 'string' ? value.trim() : '';
    const resolution =
        positive(model.width) && positive(model.height)
            ? `${Math.round(model.width)} × ${Math.round(model.height)}`
            : '';
    const details = [
        `Player: ${names[model.player] || model.player || '—'}`,
        `Resolution: ${resolution || 'waiting for decoding'}`,
    ];
    if (text(model.videoCodec))
        details.push(`Video: ${text(model.videoCodec)}`);
    if (positive(model.fps))
        details.push(
            `Frame rate: ${model.fps.toLocaleString('en-US', { maximumFractionDigits: 2 })} fps`
        );
    if (positive(model.videoBitrateBps))
        details.push(
            `Video bitrate: ${(model.videoBitrateBps / 1000000).toLocaleString('en-US', { maximumFractionDigits: 2 })} Mbit/s`
        );
    if (text(model.audioCodec))
        details.push(`Audio: ${text(model.audioCodec)}`);
    if (text(model.audioChannels))
        details.push(`Channels: ${text(model.audioChannels)}`);
    if (text(model.container))
        details.push(`Container: ${text(model.container)}`);
    if (
        typeof model.bufferedAheadSeconds === 'number' &&
        Number.isFinite(model.bufferedAheadSeconds) &&
        model.bufferedAheadSeconds >= 0
    )
        details.push(
            `Buffer: ${model.bufferedAheadSeconds.toLocaleString('en-US', { maximumFractionDigits: 1 })} s`
        );
    return { resolution, details: details.join('\n') };
}

export function createInlinePlayerTools(
    host: HTMLElement,
    api: InlinePlayerToolsApi
) {
    const doc = host.ownerDocument;
    const root = doc.createElement('div');
    root.className = 'inline-player-tools';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Player and stream information');
    const row = doc.createElement('div');
    row.className = 'inline-player-tools-row';
    const label = doc.createElement('label');
    label.className = 'inline-player-tools-label';
    const caption = doc.createElement('span');
    caption.textContent = 'Player';
    const select = doc.createElement('select');
    select.className = 'inline-player-tools-select';
    select.setAttribute('aria-label', 'Video player');
    select.setAttribute('data-test-id', 'inline-player-select');
    for (const [value, title] of [
        [VideoPlayer.VideoJs, 'Video.js'],
        [VideoPlayer.Html5Player, 'HTML5'],
        [VideoPlayer.ArtPlayer, 'ArtPlayer'],
        [VideoPlayer.EmbeddedMpv, 'Embedded MPV'],
    ]) {
        if (value === 'embedded-mpv' && !api.embeddedSupported) continue;
        const option = doc.createElement('option');
        option.value = value;
        option.textContent = title;
        select.appendChild(option);
    }
    label.appendChild(caption);
    label.appendChild(select);
    const summary = doc.createElement('span');
    summary.className = 'inline-player-tools-resolution';
    summary.setAttribute('aria-label', 'Actual decoded resolution');
    summary.setAttribute('aria-live', 'polite');
    summary.setAttribute('data-test-id', 'inline-player-resolution');
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'inline-player-tools-info';
    button.textContent = 'ⓘ Stream info';
    button.setAttribute('aria-label', 'Stream information');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('data-test-id', 'inline-player-stream-info');
    const panel = doc.createElement('div');
    panel.className = 'inline-player-tools-panel';
    panel.hidden = true;
    panel.id = 'inline-player-info-' + Math.random().toString(36).slice(2);
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Stream information');
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
        const info = inlinePlayerInfoText(model);
        setText(summary, info.resolution || 'Resolution: waiting');
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
                status.textContent = 'Unable to save the selected player.';
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
