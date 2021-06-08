<?php
header("Access-Control-Allow-Origin: *");
function scan_dir($dir) {
    $ignored = array('.', '..', 'index.php', 'thumbs', 'listdir.php');

    $files = array();
    foreach (scandir($dir) as $file) {
        $path = $dir . '/' . $file;
        if (in_array($file, $ignored)) continue;
        if ((time() - filemtime($path)) > 6 * 24 * 3600) {
	  // delete file if it's older than 6 days
	  unlink($path);
	} else {
	  // file younger than 6 days
          $files[$file] = filemtime($path);
	}
    }

    arsort($files);
    $files = array_keys($files);

    return ($files) ? $files : false;
}

$files = scan_dir('.');
echo json_encode($files);

?>
