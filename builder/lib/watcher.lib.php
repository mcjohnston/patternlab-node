<?php

/*!
 * Pattern Lab Watcher Class - v0.1
 *
 * Copyright (c) 2013 Dave Olsen, http://dmolsen.com
 * Licensed under the MIT license
 *
 * Watches the source/patterns dir for any changes so they can be automagically
 * moved to the public/patterns dir.
 *
 * This is not the most efficient implementation of a directory watch but I hope
 * it's the most platform agnostic.
 *
 */

class Watcher extends Builder {
	
	/**
	* Use the Builder __construct to gather the config variables
	*/
	public function __construct() {
		
		// construct the parent
		parent::__construct();
		
	}
	
	/**
	* Watch the source directory for any changes to existing files. Will run forever if given the chance
	*/
	public function watch() {
		
		$c = false;          // have the files been added to the overall object?
		$t = false;          // was their a change found? re-render
		$k = false;          // was the entry not a part of the $o object? make sure it's hashes are added
		$m = false;          // does the index page need to be regenerated?
		$o = new stdClass(); // create an object to hold the properties
		
		// run forever
		while (true) {
			
			// generate all of the patterns
			$entries = scandir(__DIR__.$this->sp);
			
			foreach($entries as $entry) {
				
				if (!in_array($entry,$this->if)) {
					
					// figure out how to watch for new directories and new files
					if (!isset($o->$entry)) {
						$o->$entry = new stdClass();
						$k = true;
					}
					
					// figure out the md5 hash of a file so we can track changes
					// runs well on a solid state drive. no idea if it thrashes regular disks
					$ph = $this->md5File(__DIR__.$this->sp.$entry."/".$entry.".mustache");
					$dh = $this->md5File(__DIR__.$this->sp.$entry."/data.json");
					
					// if the directory wasn't being checked already add the md5 sums
					if ($k) {
						
						$o->$entry->ph = $ph;
						$o->$entry->dh = $dh;
						
						// if we're through the first check make sure to note any new directories being added to Pattern Lab
						// assuming a pattern actually exists
						if ($c && ($o->$entry->ph != '')) {
							print $entry."/".$entry.".mustache added to Pattern Lab...\n";
							$t = true;
							$m = true;
						}
						
						$k = false;
						
					} else {
						
						if ($o->$entry->ph != $ph) {
							
							if ($c && ($o->$entry->ph == '')) {
								print $entry."/".$entry.".mustache added to Pattern Lab...\n";
								$m = true;
							} else {
								print $entry."/".$entry.".mustache changed...\n";
							}
							
							$t = true;
							$o->$entry->ph = $ph;
							
						}
						
						if ($o->$entry->dh != $dh) {
							$t = true;
							$o->$entry->dh = $dh;
							print $entry."/data.json changed...\n";
						}
						
					}
					
					// if a file has been added or changed then render & move the *entire* project (shakes fist at partials)
					// if a new directory was added regenerate the main pages
					// also update the change time so that content sync will work properly
					if ($t) {
						$this->gatherData();
						$this->renderAndMove();
						$this->generateViewAllPages();
						$this->updateChangeTime();
						if ($m) {
							$this->generateMainPages();
							$m = false;
						}
						$t = false;
					}
					
				}
				
			}
			
			// check the user-supplied watch files (e.g. css)
			$i = 0;
			foreach($this->wf as $wf) {
				
				if (!isset($o->$wf)) {
					$o->$wf = new stdClass();
				}
				
				// md5 hash the user-supplied filenames, if it's changed just move the single file
				// update the change time so that content sync will work properly
				$fh = $this->md5File(__DIR__."/../../../source".$wf);
				if (!isset($o->$wf->fh)) {
					$o->$wf->fh = $fh;
				} else {
					if ($o->$wf->fh != $fh) {
						$o->$wf->fh = $fh;
						$this->moveFile($wf,$this->mf[$i]);
						$this->updateChangeTime();
						print $wf." changed...\n";
					};
					$i++;
				}
				
			}
			
			// check the main data.json file for changes, if it's changed render & move the *entire* project
			// update the change time so that content sync will work properly
			$dh = $this->md5File(__DIR__."/../../source/data/data.json");
			if (!isset($o->dh)) {
				$o->dh = $dh;
			} else {
				if ($o->dh != $dh) {
					$o->dh = $dh;
					$this->gatherData();
					$this->renderAndMove();
					$this->generateViewAllPages();
					$this->updateChangeTime();
					print "data/data.json changed...\n";
				};
			}
			
			$c = true;
		}
		
	}
	
	/**
	* Converts a given file into an md5 string
	* @param  {String}       file name to be hashed
	*
	* @return {String}       md5 string of the file or an empty string if the file wasn't found
	*/
	private function md5File($f) {
		$r = file_exists($f) ? md5_file($f) : '';
		return $r;
	}
	
	/**
	* Copies a file from the given source path to the given public path
	* @param  {String}       the source pattern name
	* @param  {String}       the public pattern name
	*
	* @return {String}       copied file
	*/
	private function moveFile($s,$p) {
		copy(__DIR__."/../../source".$s,__DIR__."/../../public".$p);
	}
	
}