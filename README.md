# VLC TV Scheduler

Play your media non-stop by using the **VLC TV Scheduler** to control the [VLC Media Player](https://www.videolan.org/vlc/). VLC TV Scheduler provides a simple user interface to select folders containing media you want to play, and mixes the media folders together into a playlist that resembles a TV schedule.

It automatically controls video playback in VLC (which you should separately install on your system).

![VLC TV Scheduler](/docs/sample-app-screenshot.png)

VLC TV Scheduler works with directories rather than individual media files. You should put an entire TV series in one folder, then you can configure what time of day / week you want each TV series to air, etc.

## Features

![Mixing](/docs/tv-mixing-params.png)

- **Scheduling.** You can setup a directory to only play on Tuesdays, or from noon to 4pm. 

- **Ordering.** A folder can play in alphabetical order, for series that have a linear plot, or be randomized (every episode will play before repeating).

- **Equal intermixing.** No matter how big or small the directories with media content are, VLC TV Scheduler will ensure that their media files appear equally often in the playlist. For example, if you have two directories — one with several files (`A1, A2, A3, A4`) and one with just a single file (`B1`) — the resulting playlist would be: `A1, B1, A2, B1, A3, B1, A4, B1`. You can make a series play multiple episodes back-to-back by changing the "Play Episode Count".

- **Fixed playtime.** You can configure videos in a directory to only play for 10 seconds, as an example, before moving on.

### Command Line Arguments

``--autoplay=true``

The application will automatically open VLC and start playing the playlist when it starts. Useful for a computer that is a dedicated TV device and you want the computer to play videos at startup (in case a power surge causes a reboot, etc).

``--minimize=true``

The application window will minimize after the application starts.

## VLC Player Configuration

By default, VLC does not open in full screen, which is probably what you want if you're using this program. To do so:

1. Open VLC Media Player.
2. Go to the menu, click **Tools** and select **Preferences**.
3. When the Preferences menu appears, click the **Video** button to bring up the **General Video Settings**.
4. Check the **Fullscreen** checkbox.
5. Click the **Save** button!

## Contributing

This is an Electron application. For development, you should have the [latest LTS version of Node.js installed](https://nodejs.org/en).

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

## TODO Feature List

- Re-implement fixed playtime after stability testing
- Advertisement folders
- Analyze video for ad break spots
- Time boxing to intervals (e.g. 30 minutes), where ads fill in the remaining time
- Create a "coming up next" screen dynamically (list of future episodes & times), which can be shown during ad breaks
- Change folder configured after selection / manual entry of folder
- Support for images
- Support for livestreams
