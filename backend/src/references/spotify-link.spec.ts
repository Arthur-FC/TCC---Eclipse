import { BadRequestException } from '@nestjs/common';
import { parseSpotifyTrackLink } from './spotify-link';

describe('parseSpotifyTrackLink', () => {
  const trackId = '11dFghVXANMlKmJXsNCbNl';

  it('accepts canonical and localized Spotify track links', () => {
    expect(
      parseSpotifyTrackLink(
        `https://open.spotify.com/intl-pt/track/${trackId}?si=tracking`,
      ),
    ).toEqual({
      trackId,
      canonicalUrl: `https://open.spotify.com/track/${trackId}`,
    });
  });

  it.each([
    'https://example.com/track/11dFghVXANMlKmJXsNCbNl',
    'https://open.spotify.com/album/11dFghVXANMlKmJXsNCbNl',
    'https://open.spotify.com/track/id-curto',
    'spotify:track:11dFghVXANMlKmJXsNCbNl',
  ])('rejects unsupported links: %s', (link) => {
    expect(() => parseSpotifyTrackLink(link)).toThrow(BadRequestException);
  });
});
