# TODO

Downloader:

* Proper introduction to what the app does
* Options
  * Option to link people data
  * Option to link people data
* Show errors in log
* Host on github pages
* Add google analytics

Fixes:
* Use email instead of user ids. Better for logging etc
* Handle too many requests better. wait and retry?
* Show error when not verified token/room id

Reader:

* Show files much better (name, size) esp for non-images
* Support linking instead of downloaded files
* Support linking instead of downloaded avatars


* Avoid js errors for avatars and files
* Show date headers in reader (per month?)
* Ellipsis long file names in log
* Sort order for messages (newest on top, oldest on top)
* Possible to stop / cancel download
* Open images on top of page
* Show initials and random color if missing avatar
* Remember preference settings too
* Log of what was downloaded / not downloaded
* Warn about missing support for cards (or is fallback good enough?)
* Cache people too, to avoid so much re-downloading

Documentation

* How to use
* Security aspects
* Not supported:
  * Reactions, group space avatars, cards


Ski room:
Y2lzY29zcGFyazovL3VzL1JPT00vYTE1YjMwODAtYTYxNy0xMWVkLWEwMGItMWRjYzg4YTNmNTRk


## API Feedback

Missing api wise to be able to make a decent working chat client:

* No api for unread messages
* No api for listing reactions (or for reacting)
* No avatar for spaces?
* Very limited people search - no substring search, no username search
* No API to search for spaces - need to download eg 1000, search them, then potentially download 1000 more
  * Extremely slow "list room" search (+10 sec)
* Very slow to search for people one by one
* No API to search for text in messages