const test=require('node:test');
const assert=require('node:assert/strict');
const U=require('../js/order-utils.js');

const item={
  itemKey:'fan-1',mode:'selection',model:'AXW/ATEX 50-2T-3',series:'AXW/ATEX',manufacturer:'Vitlo',
  description:'Ex-proof axial fan',selected:{q:13000,p:100},voltage:'400V',frequency:'50Hz',
  motorPower:2.2,current:4.45,speed:2875,quantity:2,price:2062,discountPercent:18
};

test('quotation products become supplier-safe order lines',()=>{
  const now=new Date(2026,7,13,14,30,0);
  const order=U.createOrder({
    now,random:()=>0.123456,
    project:{id:'prj_purchase_123456',name:'Hangar',reference:'Müşteri A',contact:'Ayşe Hanım'},
    quotation:{quotationNumber:'VNS-260813-143000',settings:{summary:{deliveryTime:'6-8 hafta'}},items:[item]}
  });

  assert.equal(order.orderNumber,'VNS-SIP-260813-01');
  assert.equal(order.sourceQuotationNumber,'VNS-260813-143000');
  assert.equal(order.supplier,'Vitlo');
  assert.equal(order.deliveryTime,'6-8 hafta');
  assert.equal(order.items[0].quantity,2);
  assert.equal(order.items[0].included,true);
  assert.equal(Object.hasOwn(order.items[0],'price'),false);
  assert.equal(Object.hasOwn(order.items[0],'discountPercent'),false);
});

test('order numbering increments per day and included totals stay independent',()=>{
  const date=new Date(2026,7,13,10,0,0);
  assert.equal(U.nextOrderNumber([{orderNumber:'VNS-SIP-260813-01'},{orderNumber:'VNS-SIP-260813-04'}],date),'VNS-SIP-260813-05');
  const order=U.normalizeOrder({items:[item,{...item,itemKey:'fan-2',quantity:3,included:false}]});
  assert.equal(U.includedItems(order).length,1);
  assert.equal(U.totalUnits(order),2);
  assert.equal(U.projectStatusLabel('ordered'),'Sipariş Verildi');
  assert.equal(U.recipientType('distributor'),'distributor');
});
