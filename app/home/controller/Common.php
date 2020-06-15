<?php

namespace app\home\controller;

use think\Input;
use think\Db;
use clt\Leftnav;
use think\Request;
use think\Controller;

class Common extends Controller
{
    protected $pagesize;

    public function _initialize()
    {
        $sys = F('System');
        $this->assign('sys', $sys);
        //获取控制方法
        $request = Request::instance();
        $action = $request->action();
        $controller = $request->controller();
        $this->assign('action', ($action));
        $this->assign('controller', strtolower($controller));
        define('MODULE_NAME', strtolower($controller));
        define('ACTION_NAME', strtolower($action));

        //导航
        $category = db('category');
        $thisCat = $category->where('id', input('catId'))->find();
        $this->assign('title', $thisCat['title']);
        $this->assign('keywords', $thisCat['keywords']);
        $this->assign('description', $thisCat['description']);
        define('DBNAME', strtolower($thisCat['module']));
        $this->pagesize = $thisCat['pagesize'] > 0 ? $thisCat['pagesize'] : '';
        // 获取缓存数据
        $cate = cache('cate');
        if (!$cate) {
            $column_one = $category->where(['parentid' => 0, 'ismenu' => 1])->order('listorder')->select();
            $column_two = $category->where(['ismenu' => 1])->order('listorder')->select();;
            $tree = new Leftnav ();
            $cate = $tree->index_top($column_one, $column_two);
            cache('cate', $cate, 3600);
        }

//        当前分类
        $this->assign('thisCategory', $thisCat);

        $cArray = [];
        foreach ($cate as $c) {

            if ($c['id'] == input('catId')) {
//        子分类
                $this->assign('subCategory', $c['sub']);
            }
            if ($c['id'] == $thisCat['parentid']) {
//        父级分类
                $this->assign('superCategory', $c);
            }

//            产品
            $scArray = [];
            foreach ($c['sub'] as $sc) {
                $prods = db('mproduction')->alias('a')
                    ->join(config('database.prefix') . 'category c', 'a.catid = c.id', 'left')
                    ->where('catid', $sc['id'])
                    ->order('/*listorder asc,*/createtime desc')
                    ->field('a.id,a.catid,a.title,c.catdir')
                    ->select();
                $sc['prods'] = $prods;
                array_push($scArray, $sc);
            }


            $c['sub'] = $scArray;
            $prods = db('mproduction')->alias('a')
                ->join(config('database.prefix') . 'category c', 'a.catid = c.id', 'left')
                ->where('catid', $c['id'])
                ->order('/*listorder asc,*/createtime desc')
                ->field('a.id,a.catid,a.title,c.catdir')
                ->select();
            $c['prods'] = $prods;

            array_push($cArray, $c);
        }

//  所有分类
        $this->assign('category', $cArray);


        //广告
        $adList = cache('adList');
        if (!$adList) {
            $adList = db('ad')->where(['type_id' => 1, 'open' => 1])->order('sort asc')->limit('4')->select();
            cache('adList', $adList, 3600);
        }
        $this->assign('adList', $adList);
        //友情链接
        $linkList = cache('linkList');
        if (!$linkList) {
            $linkList = db('link')->where('open', 1)->order('sort asc')->select();
            cache('linkList', $linkList, 3600);
        }
        $this->assign('linkList', $linkList);
    }

    public function _empty()
    {
        return $this->error('空操作，返回上次访问页面中...');
    }
}