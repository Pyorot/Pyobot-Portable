# Pyobot-Portable

Pyobot v2.4 in portable form.

### Setting up
1. Bot runner creates new Discord bot via https://discordapp.com/developers/applications/me; notes down "bot token" and "Client ID".
2. Server owner sets up notification channels; adds bot via https://discordapp.com/oauth2/authorize?client_id=CLIENT_ID_GOES_HERE&scope=bot&permissions=0; gives the bot "send messages" and "embed links" permissions on the relevant channels.
3. Server owner sets up a new channel for the bot to post status messages in (hides it from everyone else if they want to), notes down channel ID, gives bot "send messages" permission on this channel.
4. Bot runner follows the instructions here ("Quick start steps" at https://developers.google.com/maps/documentation/static-maps/) to get an API key for Google Maps, notes down this key. This requires a Google account.
5. Bot runner goes here (https://jsonblob.com/0d4f6bd7-3a51-11e7-ae4c-5b62a123505b) and saves a new copy of this JSON (copy it, click new, paste it replacing whatever's in the window, then save), noting down the new code in the URL. If a new copy is not saved, someone may edit the JSON at this link and modify your bot settings.
6. Bot runner configures bot. First, make a copy of the bot code [here](https://github.com/Pyorot/Pyobot-Portable/blob/master/discord%20bot%202.4%20public.js). Then:
  - Paste the JSON URL code from step #5 between the `'` at `rom_code` (e.g. `rom_code = '0d4f6bd7-3a51-11e7-ae4c-5b62a123505b'`).
  - Paste the status channel ID between the `'` at `status_channel`.
  - Paste the bot token (#1) and Google Maps API key (#4) into your copy of the JSON between the `"` at `bot` and `google`, respectively.
  - Register all notification channel/status channel IDs with your own names in the JSON in the `channel` section (see `example` in the JSON). Remember to separate entries with commas; the editor will warn you.
  - Set up your filtering settings in the JSON (see *Filter syntax* below).

### Filter Syntax
- `allTarget`, `secondTarget` and `highTarget` have keys dex numbers and values channel names (according to what names you register in `channels`.
- `allIV`, `secondIV` and `highIV` have keys dex numbers and values IV filters (in the deficit from 45 format -- i.e. 0 = 100%, -1 = 44/45 = 98%, -2 = 43/45 = 96%, ... , -45 = 0/45 = 0%).
- `allTarget` is for your default channels for each species (if the species isn't specified, it won't be posted). If no `allIV` is specified, it will post all of that species to that channel; else, it will filter according to `allIV`.
- `secondTarget` is for posting to a different channel with more restrictive filtering (if the species isn't specified, it won't be posted to a second channel) -- e.g. high IV Larvitar where `allTarget` handles all Larvitar. `secondIV` must be more restrictive than `allIV`; if it's not specified, the filter will be the same as the one on `allTarget`.
- If `highchannel` is specified (i.e. not `""`), all perfect mons are posted to `highchannel`. This must be left `""` to disable this feature.
- `highIV` handles exceptions to `highchannel`, but that's a niche use I won't bother documenting for now.

### Running The Bot
(Requires Desktop/Laptop to be always on.)
1. Open a tab of LondonPogoMap.
2. Click Filter, then set the in-map filter to 100%.
3. Click "Select All" (alternatively, check the boxes for all Pokemon you want notified).
4. Open the browser console by pressing F12 and finding "console".
5. Paste your bot code and hit enter. There should be a message in the status channel after 2s, and periodic messages there every 20 mins or if there is a failure. Every Pokemon posted should come up both in console and in the correct channel on Discord.
