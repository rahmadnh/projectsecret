<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

$json = file_get_contents('php://input');
$data = json_decode($json);

if ($data && $data->image) {
    $img = $data->image;
    $img = str_replace('data:image/png;base64,', '', $img);
    $img = str_replace(' ', '+', $img);
    $data_img = base64_decode($img);

    if (!file_exists('captures')) {
        mkdir('captures', 0777, true);
    }

    $file = 'captures/moment_' . time() . '.png';
    file_put_contents($file, $data_img);
    echo json_encode(["status" => "Saved"]);
}
?>