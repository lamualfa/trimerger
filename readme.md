<h1 align="center">Trimerger</h1> 

<p align="center">
  <img src="./screenshot.png" width="620" />
</p>

<p align="center">
  Easily trim a video using multiple timestamps with FFMPEG.
</p>

<p align="center">
  <img alt="Static Badge" src="https://badgen.net/npm/v/trimerger?color=red">
  <img alt="Static Badge" src="https://badgen.net/static/ffmpeg/6.0/green">
  <img alt="Static Badge" src="https://badgen.net/static/license/WTFPL/purple">
</p>

<hr/>

## Usage

**Important!**

Please run the following command inside the folder where your video is located.

**`NPM`**
```bash
npx trimerger
```

**`PNPM`**
```bash
pnpm dlx trimerger
```

**`Yarn`**
```bash
yarn dlx trimerger
```

## Notes

- Currently `trimerger` only support `.mp4` video.
- The trimming results may not accurate because we don't re-encode the video for performance purpose. The accurate option will be implemented later.