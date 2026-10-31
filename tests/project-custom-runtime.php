<?php
declare(strict_types=1);
require dirname(__DIR__) . '/api/custom-products/bootstrap.php';
require dirname(__DIR__) . '/api/projects/bootstrap.php';
function verify(bool $result, string $message): void { if (!$result) { throw new RuntimeException($message); } }
$source = ['id'=>'cpp_test','productType'=>'fan','model'=>'Test','series'=>'Type','manufacturer'=>'Brand','description'=>"Line one\nLine two",'price'=>125,'quantity'=>2,'scope'=>'project','projectId'=>'prj_test','projectName'=>'Project Test','image'=>'data:image/webp;base64,'.str_repeat('A',6000),'createdAt'=>'2026-10-31T12:00:00Z','updatedAt'=>'2026-10-31T12:00:00Z'];
$record = custom_product_record($source);
verify($record['scope']==='project' && $record['projectId']==='prj_test' && $record['projectName']==='Project Test','project identity persists');
$line = project_item(['itemKey'=>'line_test','mode'=>'custom','productType'=>'fan','productKey'=>$record['id'],'model'=>$record['model'],'series'=>$record['series'],'manufacturer'=>$record['manufacturer'],'description'=>$record['description'],'image'=>$record['image'],'price'=>$record['price'],'quantity'=>$record['quantity']]);
verify($line['image']===$source['image'] && $line['description']===$source['description'] && $line['price']===125.0,'server accepts library images and basic project fields');
unset($source['scope'],$source['projectId'],$source['projectName']);
verify(custom_product_record($source)['scope']==='shared','legacy shared records remain shared');
$source['scope']='project';
try { custom_product_record($source); throw new RuntimeException('missing project accepted'); } catch (EditApiException $error) { verify($error->httpStatus===422,'missing project rejected'); }
echo "Project-scoped custom product validation passed\n";
