package me.tinykitten.trainlcd

import android.graphics.Color

/**
 * 路線色を主役にしたホーム画面ウィジェットの配色。
 *
 * 背景を路線色で塗るため、文字やアイコンの色は端末のテーマではなく路線色の明るさで決まる。
 * iOS版(HomeScreenWidget.swiftのlineColorLuminance / lineForegroundColor)と
 * 同じ式・同じ閾値にしており、片方だけ変えないこと。
 */
object WidgetTheme {
    /**
     * 白文字が読めなくなる明るさの境目。
     * 山手線(#80C241)のような中間色は白のままにしたいので、総武線(#FFD400)クラスの
     * 明るい路線色だけが黒へ倒れるよう高めに取っている。
     */
    private const val LIGHT_LINE_LUMINANCE = 0.7

    /** 副次的な文字・アイコンに使う前景色の不透明度 */
    private const val SECONDARY_ALPHA = 0.85f

    /** iOS版のLineColorChipと揃えたカプセルの不透明度 */
    const val CHIP_ALPHA = 0.18f

    /** 路線色の面に載せる文字・アイコンの色 */
    fun onLineColor(lineColor: Int): Int =
        if (perceivedLuminance(lineColor) > LIGHT_LINE_LUMINANCE) Color.BLACK else Color.WHITE

    /** 路線色の面に載せる副次的な文字・アイコンの色 */
    fun onLineColorSecondary(lineColor: Int): Int =
        withAlpha(onLineColor(lineColor), SECONDARY_ALPHA)

    /** 0..1の不透明度を適用した色を返す。RGBはそのまま、アルファのみ差し替える */
    fun withAlpha(color: Int, alpha: Float): Int =
        Color.argb(
            (alpha.coerceIn(0f, 1f) * 255).toInt(),
            Color.red(color),
            Color.green(color),
            Color.blue(color)
        )

    /**
     * 知覚輝度(0..1)。
     * WCAGのガンマ補正まで行うと路線色の見た目より暗く判定されるため、加重平均の近似で足りる。
     */
    private fun perceivedLuminance(color: Int): Double =
        (0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)) / 255
}
