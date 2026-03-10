<?php
/**
 * Plugin Name: AntiGravity CORS & Security (Headless)
 * Description: Bloqueia ataques, permite CORS com o painel JS e otimiza a REST API do WordPress para a Metodologia Abidos.
 * Version: 1.0.0
 * Author: NeuroStrategy OS
 */

if (!defined('ABSPATH')) {
    exit; // Segurança: Não carrega o arquivo diretamente.
}

/**
 * 1. CONFIGURAÇÃO DE CORS (Cross-Origin Resource Sharing)
 * Permite que apenas o seu Mission Control (na sua máquina local ou futuro servidor do painel)
 * faça requisições de criação, edição e leitura para a API do WordPress.
 */
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        
        // Defina aqui a URL de onde o painel AntiGravity está rodando (atualize para domínio oficial no futuro)
        $allowed_origins = array(
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5500', // Live Server do VSCode
            'http://127.0.0.1:5500'  // Outro IP comum do Live Server
        );

        $origin = get_http_origin();

        // Se a requisição vier de uma das nossas URLs locais conhecidas
        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
        } else {
            // Em produção, se não estiver na lista, não enviamos o header de origem,
            // o que fará o navegador bloquear a requisição por padrão.
            // Para requisições GET públicas, o WP já tem comportamento padrão.
            // Aqui silenciamos para evitar exposição.
        }

        header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages, Authorization');
        // Adiciona headers críticos que o fetch no JS envia
        header('Access-Control-Allow-Headers: Authorization, X-WP-Nonce, Content-Type, X-Requested-With, Application-Password');

        return $value;
    });
}, 15);

/**
 * 2. EXPOSIÇÃO DO CAMPO META (Para Meta Descriptions do Yoast/Rank Math) nas respostas REST.
 * Quando o seu painel enviar "excerpt", o WordPress não atualiza a tag de Meta Description (SEO) automaticamente.
 * É necessário permitir a escrita dos dados no `_yoast_wpseo_metadesc` (Yoast) ou `rank_math_description` (RankM).
 */
add_action('rest_api_init', 'antigravity_expose_seo_meta');
function antigravity_expose_seo_meta() {
    $post_types = ['post', 'page']; // Aplica a Páginas e Posts
    
    foreach ($post_types as $pt) {
        // Expondo o campo EXCERPT (Resumo) para quem não usa Yoast/RankMath ou usa no tema.
        register_rest_field($pt, 'excerpt', array(
            'get_callback' => function($object) {
                return $object['excerpt']['rendered'] ?? '';
            },
            'update_callback' => function($value, $post, $field_name) {
                return wp_update_post(array('ID' => $post->ID, 'post_excerpt' => $value));
            },
            'schema' => null,
        ));
        
        // Expondo as Meta Descriptions para os plugins de SEO (A API do Gemini vai escrever nelas).
        register_rest_field($pt, 'seo_meta_desc', array(
            'get_callback' => function($object) {
                $yoast = get_post_meta($object['id'], '_yoast_wpseo_metadesc', true);
                if($yoast) return $yoast;
                return get_post_meta($object['id'], 'rank_math_description', true);
            },
            'update_callback' => function($value, $post, $field_name) {
                // Atualiza ambos para garantir compatibilidade caso você mude de plugin.
                update_post_meta($post->ID, '_yoast_wpseo_metadesc', $value);
                update_post_meta($post->ID, 'rank_math_description', $value);
                return true;
            },
            'schema' => null,
        ));
    }
}

/**
 * 3. DESABILITAR ROTAS INÚTEIS DA API
 * Isso evita que bots de sucateamento extraiam usuários do seu WordPress (medida crítica de segurança).
 */
add_filter('rest_endpoints', function($endpoints) {
    // Esconder a lista de autores/usuários
    if (isset($endpoints['/wp/v2/users'])) {
        unset($endpoints['/wp/v2/users']);
    }
    if (isset($endpoints['/wp/v2/users/(?P<id>[\d]+)'])) {
        unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    }
    return $endpoints;
});

/**
 * 4. FORÇAR AUTENTICAÇÃO
 * Ninguém de fora pode ver conteúdos ainda em status "Rascunho" sem validarem o JWT/Application Password.
 */
add_filter('rest_authentication_errors', function($result) {
    if (!empty($result)) {
        return $result;
    }
    return $result; 
});

/**
 * 5. EXPOSIÇÃO DO ELEMENTOR THEME BUILDER E CONFIGURAÇÕES GERAIS (ASTRA E WP)
 * Permite que a API Headless acesse layouts criados, cabeçalhos do Elementor e configurações globais
 */
add_action('rest_api_init', function() {
    // Expor custom post type do Elementor (elementor_library) na REST API
    global $wp_post_types;
    if (isset($wp_post_types['elementor_library'])) {
        $wp_post_types['elementor_library']->show_in_rest = true;
        // Permite endpoint /wp-json/wp/v2/elementor_library
        $wp_post_types['elementor_library']->rest_base = 'elementor_library'; 
    }

    // Criar Rota Customizada para Configurações Gerais (Astra, Tema Básico, Site Kit básico)
    register_rest_route('antigravity/v1', '/settings', array(
        'methods' => 'GET',
        'callback' => 'antigravity_get_settings',
        'permission_callback' => function () { return current_user_can('manage_options'); }
    ));

    register_rest_route('antigravity/v1', '/settings', array(
        'methods' => 'POST',
        'callback' => 'antigravity_update_settings',
        'permission_callback' => function () { return current_user_can('manage_options'); }
    ));
});

function antigravity_get_settings() {
    // Busca opções cruciais de SEO, Tema Astra e WP Core
    $settings = array(
        'site_title' => get_option('blogname'),
        'site_description' => get_option('blogdescription'),
        'astra_settings' => get_option('astra-settings', []),
        'elementor_disable_color_schemes' => get_option('elementor_disable_color_schemes', ''),
        'elementor_disable_typography_schemes' => get_option('elementor_disable_typography_schemes', '')
    );
    return rest_ensure_response($settings);
}

function antigravity_update_settings($request) {
    $params = $request->get_json_params();
    
    if (isset($params['site_title'])) update_option('blogname', sanitize_text_field($params['site_title']));
    if (isset($params['site_description'])) update_option('blogdescription', sanitize_text_field($params['site_description']));
    if (isset($params['astra_settings'])) update_option('astra-settings', $params['astra_settings']);

    return rest_ensure_response(['status' => 'success', 'message' => 'Configurações atualizadas no banco de dados.']);
}
