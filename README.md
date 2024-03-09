# VLC TV Scheduler

Use [VLC](https://www.videolan.org/vlc/) to play your media non-stop, like running your own TV station! This application provides a simple user interface to select folders containing media you want to play, and mixes them together into a playlist that resembles a TV schedule.

It automatically controls video playback in VLC (which you should separately install on your system).

![VLC TV Scheduler](/docs/sample-app-screenshot.png)

VLC TV Scheduler works with directories rather than individual media files. You should put an entire TV series in one folder, then you can configure what time of day / week you want each TV series to air, etc.

## Features

![Mixing](/docs/tv-mixing-params.png)

- **Scheduling.** You can setup a directory to only play on Tuesdays, or from noon to 4pm. 

- **Ordering.** A folder can play in alphabetical order, for series that have a linear plot, or be randomized (every episode will play before repeating).

- **Equal intermixing.** No matter how big or small the directories with media content are, VLC TV Scheduler will ensure that their media files appear equally often in the playlist. For example, if you have two directories — one with several files (`A1, A2, A3, A4`) and one with just a single file (`B1`) — the resulting playlist would be: `A1, B1, A2, B1, A3, B1, A4, B1`. You can can make a series play multiple episodes back-to-back by changing the "Play Episode Count".

- **Fixed playtime.** You can configure videos in a directory to only play for 10 seconds, as an example, before moving on.

## Contributing

This is an Electron application. For development, you should have the latest LTS version of Node.js installed.

### Development Workspace Setup

Fork the repository and clone it.

```
git clone git@github.com:YOUR_FORK/vlc-tv-scheduler.git
```

Inside of the repository folder, run npm install

```
cd vlc-tv-scheduler
npm install
```

Now you can run the application

```
npm run start
```
