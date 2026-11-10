import { VideoPlayer } from '@iptvnator/shared/interfaces';
import {
    createInlinePlayerTools,
    inlinePlayerInfoText,
    readInlinePlayerInfo,
} from './inline-player-tools';

describe('inline player tools', () => {
    let host: HTMLElement;
    beforeEach(() => {
        host = document.createElement('div');
        document.body.appendChild(host);
    });
    afterEach(() => {
        host.remove();
    });
    const change = async (select: HTMLSelectElement, value: VideoPlayer) => {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
    };
    it('switches players in both directions and shows decoded stream information', async () => {
        let player = VideoPlayer.VideoJs;
        const switchTo = jest.fn(async (value: VideoPlayer) => {
            player = value;
        });
        const tools = createInlinePlayerTools(host, {
            embeddedSupported: true,
            switchTo,
            read: () => ({
                player,
                width: player === VideoPlayer.EmbeddedMpv ? 3840 : 1920,
                height: player === VideoPlayer.EmbeddedMpv ? 2160 : 1080,
                videoCodec: 'hevc',
            }),
        });
        const select = host.querySelector('select')!;
        expect(select.options.length).toBe(4);
        await change(select, VideoPlayer.EmbeddedMpv);
        expect(switchTo).toHaveBeenCalledWith(VideoPlayer.EmbeddedMpv);
        expect(host.textContent).toContain('3840 × 2160');
        host.querySelector('button')!.click();
        expect(host.querySelector('[role=region]')!.textContent).toContain(
            'hevc'
        );
        await change(select, VideoPlayer.VideoJs);
        expect(host.textContent).toContain('1920 × 1080');
        tools.refresh({ player: VideoPlayer.EmbeddedMpv, width: 0, height: 0 });
        expect(host.querySelector('[role=region]')!.textContent).not.toContain(
            '3840'
        );
        tools.dispose();
        expect(host.children.length).toBe(0);
    });
    it('keeps the current player after a persistence failure and allows retry', async () => {
        const tools = createInlinePlayerTools(host, {
            embeddedSupported: false,
            read: () => ({ player: VideoPlayer.VideoJs, width: 0, height: 0 }),
            switchTo: jest.fn().mockRejectedValue(new Error('test failure')),
        });
        const select = host.querySelector('select')!;
        expect(select.options.length).toBe(3);
        await change(select, VideoPlayer.Html5Player);
        expect(select.value).toBe(VideoPlayer.VideoJs);
        expect(select.disabled).toBe(false);
        expect(host.querySelector<HTMLElement>('[role=status]')!.hidden).toBe(
            false
        );
        tools.dispose();
    });
    it('ignores old native dimensions after switching back to a web player', () => {
        const video = document.createElement('video');
        host.appendChild(video);
        Object.defineProperties(video, {
            videoWidth: { value: 1280 },
            videoHeight: { value: 720 },
        });
        expect(
            readInlinePlayerInfo(host, VideoPlayer.VideoJs, null)
        ).toMatchObject({ width: 1280, height: 720 });
        expect(
            readInlinePlayerInfo(host, VideoPlayer.EmbeddedMpv, null)
        ).toMatchObject({ width: 0, height: 0 });
        expect(
            inlinePlayerInfoText({
                player: VideoPlayer.VideoJs,
                width: NaN,
                height: Infinity,
            }).resolution
        ).toBe('');
    });
    it('does not update detached controls after an asynchronous switch completes', async () => {
        let finish!: () => void;
        const tools = createInlinePlayerTools(host, {
            embeddedSupported: true,
            read: () => ({ player: VideoPlayer.VideoJs, width: 0, height: 0 }),
            switchTo: () =>
                new Promise<void>((resolve) => {
                    finish = resolve;
                }),
        });
        const select = host.querySelector('select')!;
        const changing = change(select, VideoPlayer.EmbeddedMpv);
        tools.dispose();
        finish();
        await changing;
        expect(host.children.length).toBe(0);
    });
    it('translates existing controls and open information without remounting', () => {
        let language = 'en';
        const translations: Record<string, Record<string, string>> = {
            en: {'SETTINGS.VIDEO_PLAYER_LABEL': 'Video player', 'EMBEDDED_MPV.PLAYER.STREAM_INFO': 'Stream info', 'EMBEDDED_MPV.PLAYER.STATS_RESOLUTION': 'Resolution'},
            fr: {'SETTINGS.VIDEO_PLAYER_LABEL': 'Lecteur vidéo', 'EMBEDDED_MPV.PLAYER.STREAM_INFO': 'Informations du flux', 'EMBEDDED_MPV.PLAYER.STATS_RESOLUTION': 'Résolution'},
        };
        const tools = createInlinePlayerTools(host, {
            embeddedSupported: true,
            read: () => ({player: VideoPlayer.EmbeddedMpv, width: 3840, height: 2160}),
            switchTo: async () => undefined,
            translate: key => translations[language][key] ?? key,
            locale: () => language,
        });
        const select = host.querySelector('select')!;
        host.querySelector('button')!.click();
        language = 'fr'; tools.refresh();
        expect(host.querySelector('select')).toBe(select);
        expect(select.getAttribute('aria-label')).toBe('Lecteur vidéo');
        expect(host.querySelector('[role=region]')!.textContent).toContain('Résolution: 3840 × 2160');
        expect(select.value).toBe(VideoPlayer.EmbeddedMpv);
        language = 'en'; tools.refresh();
        expect(select.getAttribute('aria-label')).toBe('Video player');
        tools.dispose();
    });

});
