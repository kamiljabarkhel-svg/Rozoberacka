\set ON_ERROR_STOP 0
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on storage.objects to authenticated; grant usage on all sequences in schema storage to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b');
-- predajca A
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into sellers(id,name,city) values ('00000000-0000-0000-0000-00000000000a','Vrakovisko A','Nitra');
insert into seller_private(seller_id,phone) values ('00000000-0000-0000-0000-00000000000a','+421900000001');
insert into listings(seller_id,name,brand_id,model_id,category_id,oem,price) select '00000000-0000-0000-0000-00000000000a','Alternátor',b.id,m.id,'el','03G 903-023',55 from brands b join models m on m.brand_id=b.id where b.name='Škoda' and m.name='Octavia II';
insert into listing_contacts values ((select max(id) from listings),'+421900000001');
insert into listing_fits(listing_id,brand_id,model_id) select (select max(id) from listings),b.id,m.id from brands b join models m on m.brand_id=b.id where b.name='Volkswagen' and m.name='Golf VI';
insert into listings(seller_id,name,category_id,price,status) values ('00000000-0000-0000-0000-00000000000a','Skrytý diel','kar',10,'paused');
\echo T1 verified nesmie: 
update sellers set verified=true where id='00000000-0000-0000-0000-00000000000a';
select 'T1 verified='||verified from sellers;
\echo T2 storage do cudzieho priecinka (ma zlyhat):
insert into storage.objects(bucket_id,name) values ('listing-photos','00000000-0000-0000-0000-00000000000b/x.jpg');
insert into storage.objects(bucket_id,name) values ('listing-photos','00000000-0000-0000-0000-00000000000a/x.jpg');
select 'T2 objektov='||count(*) from storage.objects;
-- predajca B
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
insert into sellers(id,name) values ('00000000-0000-0000-0000-00000000000b','Vrakovisko B');
update listings set price=1 where name='Alternátor';
select 'T3 cena po pokuse B='||price from listings where name='Alternátor';
insert into listings(seller_id,name,category_id,price) values ('00000000-0000-0000-0000-00000000000a','Podvrh','kar',1);
select 'T4 B vidi skryty='||count(*) from listings where status='paused';
select 'T5 B vidi private A='||count(*) from seller_private;
insert into listings(seller_id,name,brand_id,category_id,oem,price) select '00000000-0000-0000-0000-00000000000b','Alternátor iný',b.id,'el','03G903023',50 from brands b where b.name='Audi';
-- anonym
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select 'T6 anon vidi inzeratov='||count(*) from listings;
select 'T7 anon vidi kontakty='||count(*) from listing_contacts;
select 'T8 telefon='||reveal_phone((select min(id) from listings));
select log_view((select min(id) from listings));
select 'T9 calls='||calls||' views='||views from listings where name='Alternátor';
select 'T10 pasuje na: '||string_agg(b.name||' '||coalesce(m.name,'(všetky)'),', ') from listing_vehicles((select min(id) from listings)) v join brands b on b.id=v.brand_id left join models m on m.id=v.model_id;
select 'T11 skryty telefon='||coalesce(reveal_phone((select id from listings where name='Skrytý diel')),'null');
